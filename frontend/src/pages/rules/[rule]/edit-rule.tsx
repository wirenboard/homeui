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
  // on navigation the store still holds the previous rule while isLoading is briefly
  // false; the effects below must not run with the old content
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [pageLoadError, setPageLoadError] = useState(null);
  const params = useParams();
  const ruleReady = !isLoading && loadedPath === (params['*'] ?? '');
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(!params['*']);
  const [problems, setProblems] = useState<DiagnosticCounts>({ errors: 0, warnings: 0, total: 0 });
  const editorViewRef = useRef<EditorView | null>(null);
  const ruleFileName = params['*'] || rule.name || '';
  const isTypeScript = ruleFileName.endsWith('.ts');
  const [tsSupport, setTsSupport] = useState<TsEditorSupport | null>(null);
  // a stable placeholder for an unsaved rule, so typing a title does not rebuild the service
  const servicePath = params['*'] || (isTypeScript ? 'unsaved.ts' : 'unsaved.js');

  useEffect(() => {
    if (!ruleReady) {
      setTsSupport(null);
      return undefined;
    }
    let alive = true;
    // Editor.GetTypes doubles as the feature gate: legacy firmware gets a plain editor,
    // since the vendored declarations describe a newer engine than the one installed
    const hasGetTypes = Promise.resolve()
      .then(() => editorProxy.hasMethod('GetTypes'))
      // advertisement unknown (dropped connection): assume a current engine
      .catch(() => true);
    // undefined = transient GetTypes failure, fall back to the vendored declarations;
    // null = legacy, no language service. The deadline guards an engine that
    // advertises but does not answer
    const controllerTypes: Promise<string | null | undefined> = Promise.race([
      hasGetTypes.then((has) => (has
        ? editorProxy.GetTypes().then((r) => r?.content, () => undefined)
        : null)),
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 5000)),
    ]);
    const registryDts = buildControlsRegistry(devicesStore);
    // Imports are typed against the controller's own module files
    // (Editor.ResolveModule); firmware without the method keeps the
    // wildcard `any` for every import. The advertisement check is folded
    // into the resolver rather than awaited up front: a negative answer
    // takes the full advertisement timeout, which must not delay the
    // language service of a file with no imports (the prefetch's own
    // deadline bounds it for a file with some).
    const hasResolveModule = Promise.resolve()
      .then(() => editorProxy.hasMethod('ResolveModule'))
      .catch(() => true);
    const resolveModule = (from: string, specifier: string) => hasResolveModule.then((has) => (has
      ? editorProxy.ResolveModule({ from, specifier }).then((r) => r ?? null, () => null)
      : null));
    Promise.all([
      // the heavy TS chunk loads concurrently with the GetTypes reply
      hasGetTypes.then((has) => (has
        ? import('@/stores/rules/autocomplete/ts-language-service')
        : null)),
      controllerTypes,
    ])
      .then(([m, typesDts]) => (m && typesDts !== null
        ? m.loadTsEditorSupport(servicePath, rule.content, typesDts, registryDts, resolveModule)
        : null))
      .then(
        (support) => alive && setTsSupport(support),
        () => {}, // editor still works without the language service
      );
    return () => {
      alive = false;
    };
    // rule.content only seeds the service (tsSync tracks further edits), so it is not a dependency
  }, [servicePath, ruleReady]);

  useEffect(() => {
    rulesStore.clearTsCheck();
    setProblems({ errors: 0, warnings: 0, total: 0 }); // the previous rule's count must not flash
    // the controller checks .js files too, so poll for every saved rule file
    if (params['*'] && ruleReady) {
      rulesStore.checkTsFile(params['*']);
    }
    return () => rulesStore.clearTsCheck();
  }, [params['*'], ruleReady]);

  // a fresh extensions array per keystroke would reconfigure CodeMirror and re-run every lint source
  const editorExtensions = useMemo(() => [
    ...getExtensions(devicesStore, {
      typescript: isTypeScript,
      typeAwareSource: tsSupport?.completionSource,
    }),
    ...(tsSupport?.extensions ?? []),
    controllerDiagnostics(
      () => ({
        diags: rulesStore.tsCheckDiags,
        checkedContent: rulesStore.tsCheckedContent,
      }),
      () => tsSupport?.getDiagnostics() ?? [],
      () => rulesStore.rule.error?.errorLine ?? null,
    ),
    // the getters read mobx state live, so the memo must not depend on the store values
    runtimeErrorDiagnostics(
      () => rulesStore.runtimeErrorsFor(params['*'] ?? ''),
      () => rulesStore.runningContent,
      () => rulesStore.rule.error?.errorLine ?? null,
    ),
    loadErrorDiagnostics(() => rulesStore.rule.error, () => t('rules.labels.load-error')),
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
