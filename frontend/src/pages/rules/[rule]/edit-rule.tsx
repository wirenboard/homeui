import type { EditorView } from '@codemirror/view';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { documentation } from '@/common/links';
import { Button } from '@/components/button';
import { CodeEditor, type DiagnosticCounts } from '@/components/code-editor';
import { diagnosticsUx, toggleProblemsPanel } from '@/components/code-editor/diagnostics-ux';
import { Tag } from '@/components/tag';
import { PageLayout } from '@/layouts/page';
import { editorProxy } from '@/services';
import { authStore, UserRole } from '@/stores/auth';
import { devicesStore } from '@/stores/devices';
import { rulesStore } from '@/stores/rules';
import { getExtensions, type TsEditorSupport } from '@/stores/rules/autocomplete';
import { controllerDiagnostics } from '@/stores/rules/autocomplete/controller-diagnostics';
import { loadErrorDiagnostics } from '@/stores/rules/autocomplete/load-error';
import { buildControlsRegistry } from '@/stores/rules/autocomplete/registry';
import { runtimeErrorDiagnostics } from '@/stores/rules/autocomplete/runtime-errors';
import { useAsyncAction } from '@/utils/async-action';
import { usePreventLeavePage } from '@/utils/prevent-page-leave';
import './styles.css';

const EditRulePage = observer(() => {
  const { t, i18n } = useTranslation();
  const { rule } = rulesStore;
  const { setIsDirty } = usePreventLeavePage();
  const [isLoading, setIsLoading] = useState(true);
  // the rule path whose content is in the store; on navigation the store
  // still holds the previous rule while isLoading is momentarily false, and
  // the effects below must not build the language service / ask for the
  // verdict with the old content (they would run twice per navigation)
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [pageLoadError, setPageLoadError] = useState(null);
  const params = useParams();
  const ruleReady = !isLoading && loadedPath === (params['*'] ?? '');
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(!params['*']);
  // diagnostics UX: the editor reports its problem counts for the header
  // badge, which toggles the editor's Problems panel
  const [problems, setProblems] = useState<DiagnosticCounts>({ errors: 0, warnings: 0, total: 0 });
  const editorViewRef = useRef<EditorView | null>(null);
  const ruleFileName = params['*'] || rule.name || '';
  const isTypeScript = ruleFileName.endsWith('.ts');
  const [tsSupport, setTsSupport] = useState<TsEditorSupport | null>(null);
  // for an unsaved rule the title changes on every keystroke; the service
  // is keyed on a stable placeholder path instead, so typing a name does
  // not re-run the effect below (a GetTypes RPC + environment rebuild each)
  const servicePath = params['*'] || (isTypeScript ? 'unsaved.ts' : 'unsaved.js');

  useEffect(() => {
    // the language service runs for .js rules too (allowJs + checkJs):
    // completions, hover and type errors reflect the controller's installed
    // API via GetTypes instead of the build-time snapshot
    if (!ruleReady) {
      setTsSupport(null);
      return undefined;
    }
    let alive = true;
    // Editor.GetTypes doubles as the feature gate. Legacy firmware does not
    // advertise it: the editor stays plain - no language service at all (and
    // the heavy TS chunk below is never downloaded) - because the vendored
    // declarations describe a NEWER engine and would advertise APIs and
    // promise semantics that engine does not have. The retained method
    // advertisement answers once (then cached) instead of an RPC dangling
    // for its full timeout on every rule open.
    const hasGetTypes = Promise.resolve()
      .then(() => editorProxy.hasMethod('GetTypes'))
      // advertisement state unknown (a dropped connection): assume a current
      // engine; the vendored fallback below covers the failed call
      .catch(() => true);
    // Types come from the controller (Editor.GetTypes) so the editor
    // validates against the installed engine's API. On firmware that
    // advertises the method a failed call is transient: fall back to the
    // vendored declarations (undefined) rather than degrade the editor;
    // null means legacy - no language service. A short deadline still
    // guards an engine that advertises but does not answer.
    const controllerTypes: Promise<string | null | undefined> = Promise.race([
      hasGetTypes.then((has) => (has
        ? editorProxy.GetTypes().then((r) => r?.content, () => undefined)
        : null)),
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 5000)),
    ]);
    // snapshot the live device list as a WbControls registry so the typed
    // string-ref APIs (getControl("dev/ctrl"), dev["dev/ctrl"]) validate
    // against the controls that actually exist on this controller
    const registryDts = buildControlsRegistry(devicesStore);
    Promise.all([
      // the language service (typescript + lib files, ~1 MB gzip) stays in a
      // lazy chunk, imported - concurrently with the GetTypes reply - only
      // once a rule editor opens on firmware that supports it
      hasGetTypes.then((has) => (has
        ? import('@/stores/rules/autocomplete/ts-language-service')
        : null)),
      controllerTypes,
    ])
      .then(([m, typesDts]) => (m && typesDts !== null
        ? m.loadTsEditorSupport(servicePath, rule.content, typesDts, registryDts)
        : null))
      .then(
        (support) => alive && setTsSupport(support),
        () => {}, // editor still works without the language service
      );
    return () => {
      alive = false;
    };
    // rule.content is deliberately not a dependency: it only seeds the
    // language service; tsSync() tracks all further edits
  }, [servicePath, ruleReady]);

  useEffect(() => {
    rulesStore.clearTsCheck();
    setProblems({ errors: 0, warnings: 0, total: 0 }); // the previous rule's count must not flash
    // the controller checks .js files too (checkJs), so poll its verdict
    // for every saved rule file, not only .ts
    if (params['*'] && ruleReady) {
      rulesStore.checkTsFile(params['*']);
    }
    // cancel the poll loop when leaving the page
    return () => rulesStore.clearTsCheck();
  }, [params['*'], ruleReady]);

  // rebuilt only when the language service (re)loads: a fresh extensions
  // array per keystroke would reconfigure CodeMirror and re-run every
  // lint source synchronously on each character typed
  const editorExtensions = useMemo(() => [
    ...getExtensions(devicesStore, {
      typescript: isTypeScript,
      typeAwareSource: tsSupport?.completionSource,
    }),
    ...(tsSupport?.extensions ?? []),
    // controller-side tsgo verdict, inline at the reported lines (.js too:
    // the controller runs the check with checkJs)
    controllerDiagnostics(
      () => ({
        diags: rulesStore.tsCheckDiags,
        checkedContent: rulesStore.tsCheckedContent,
      }),
      () => tsSupport?.getDiagnostics() ?? [],
      () => rulesStore.rule.error?.errorLine ?? null,
    ),
    // runtime errors from the rule console (rejected control writes,
    // uncaught exceptions, watchdog aborts) at the lines the engine
    // attributes them to; both .js and .ts. The getters read mobx state
    // live, so the memo must not depend on the store values themselves.
    runtimeErrorDiagnostics(
      () => rulesStore.runtimeErrorsFor(params['*'] ?? ''),
      () => rulesStore.runningContent,
      () => rulesStore.rule.error?.errorLine ?? null,
    ),
    // the load error of the file (Editor.Save / Editor.Load) at its line,
    // in the same gutter as everything else - one marker column
    loadErrorDiagnostics(() => rulesStore.rule.error, () => t('rules.labels.load-error')),
    // inline messages after the offending lines, gutter markers, the
    // Problems panel keymap and the counter feeding the header badge
    diagnosticsUx(setProblems),
  ], [isTypeScript, tsSupport, params['*']]);

  const errors = useMemo(() => {
    if (pageLoadError) {
      return [{ code: 404 }];
    } else if (rule.error) {
      return [{ variant: 'danger', text: rule.error.message }];
    } else {
      return [];
    }
  }, [pageLoadError, rule.error]);

  useEffect(() => {
    if (!params['*']) {
      rulesStore.resetRule();
      setLoadedPath('');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    rulesStore.load(params['*'])
      .then(() => {
        setLoadedPath(params['*'] ?? '');
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.data === 'EditorError') {
          setPageLoadError(404);
          setIsLoading(false);
        }
      });
  }, [params['*']]);

  const [save, isSaving] = useAsyncAction(async () => {
    const initRuleName = rule.initName;
    if (rule.initName !== rule.name) {
      await rulesStore.checkIsNameUnique(rule.name);
    }
    try {
      const savedContent = rule.content;
      const savedRuleName = await rulesStore.save(rule);
      setIsDirty(false);
      rulesStore.checkTsFile(savedRuleName, savedContent);
      if (!params['*']) {
        const encoded = savedRuleName.split('/').map(encodeURIComponent).join('/');
        return navigate(`/rules/${encoded}`, { replace: true });
      } else if (initRuleName !== rule.name) {
        const path = await rulesStore.rename(initRuleName, rule.name);
        const encoded = path.split('/').map(encodeURIComponent).join('/');
        return navigate(`/rules/${encoded}`, { replace: true });
      }
      setIsEditingTitle(false);
    } catch (err) {
      if (err.code === 1000) {
        rulesStore.setRuleError(t('rules.errors.dot-name'));
      }
    }
  });

  return (
    <PageLayout
      title={rule.name}
      infoLink={documentation[i18n.language]?.rule}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={isLoading}
      isEditingTitle={isEditingTitle}
      editingTitlePlaceholder={t('rules.labels.title-placeholder')}
      errors={errors}
      titleArea={!rule.enabled && <Tag variant="gray">{t('rules.labels.inactive')}</Tag>}
      actions={
        <>
          {problems.total > 0 && (
            <Button
              variant={problems.errors > 0 ? 'danger' : 'warn'}
              label={t('rules.labels.problems', { count: problems.total })}
              title={t('rules.labels.problems-hint')}
              isOutlined
              onClick={() => editorViewRef.current && toggleProblemsPanel(editorViewRef.current)}
            />
          )}
          <Button
            label={t('rules.buttons.save')}
            disabled={!rule.name}
            isLoading={isSaving}
            onClick={save}
          />
        </>
      }
      stickyHeader
      onTitleChange={(title) => rulesStore.setRuleName(title)}
      onTitleEditEnable={() => setIsEditingTitle(!isEditingTitle)}
    >
      <div className="editRule-container">
        <CodeEditor
          text={rule.content}
          errorLines={rule.error?.errorLine ? [rule.error.errorLine] : null}
          withBreakpoints={false}
          autoFocus={!!params['*']}
          extensions={editorExtensions}
          onChange={(value) => {
            setIsDirty(true);
            rulesStore.setRule(value);
          }}
          onSave={save}
          onCreateEditor={(view) => {
            editorViewRef.current = view;
          }}
        />
      </div>
    </PageLayout>
  );
});

export default EditRulePage;
