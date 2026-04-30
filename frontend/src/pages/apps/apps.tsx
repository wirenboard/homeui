import { observer } from 'mobx-react-lite';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Confirm, useConfirm } from '@/components/confirm';
import { Switch } from '@/components/switch';
import { PageLayout } from '@/layouts/page';
import { appsStore } from '@/stores/apps';
import type { AppCategory, AppItem } from '@/stores/apps';
import './styles.css';

type Filter = 'all' | 'installed' | 'updates';
type View = 'apps' | 'sources';

const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} ГБ` : `${mb} МБ`);

const CATEGORIES: { id: AppCategory | 'all'; key: string }[] = [
  { id: 'all', key: 'apps.categories.all' },
  { id: 'integrations', key: 'apps.categories.integrations' },
  { id: 'drivers', key: 'apps.categories.drivers' },
  { id: 'automation', key: 'apps.categories.automation' },
  { id: 'ui', key: 'apps.categories.ui' },
  { id: 'monitoring', key: 'apps.categories.monitoring' },
  { id: 'network', key: 'apps.categories.network' },
  { id: 'system', key: 'apps.categories.system' },
];

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35"
    />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="apps-alert-spin" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M21 12a9 9 0 1 1-9-9" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
  </svg>
);

const WarnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      d="M12 3 2 21h20L12 3Zm0 6v6m0 3h.01" />
  </svg>
);

const StatusBadges = ({ app, t }: { app: AppItem; t: (k: string) => string }) => (
  <div className="app-badges">
    {app.status === 'installed' && <span className="app-badge ok">{t('apps.badges.installed')}</span>}
    {app.status === 'update_available' && (
      <>
        <span className="app-badge ok">{t('apps.badges.installed')}</span>
        <span className="app-badge warn">{t('apps.badges.update')}</span>
      </>
    )}
    {app.status === 'installing' && <span className="app-badge info">{t('apps.badges.installing')}</span>}
    {app.source === 'official' && <span className="app-badge info">{t('apps.badges.official')}</span>}
    {app.source === 'community' && app.status === 'not_installed' && (
      <span className="app-badge">{t('apps.badges.community')}</span>
    )}
  </div>
);

const Card = observer(({ app, onSelect }: { app: AppItem; onSelect: () => void }) => {
  const { t } = useTranslation();
  const isBundle = app.kind === 'bundle';
  const missingReq = appsStore.missingRequires(app.id);
  const conflicts = appsStore.activeConflicts(app.id);
  const showRelHint = app.status === 'not_installed' && (missingReq.length > 0 || conflicts.length > 0);
  return (
    <article className={`app-card ${isBundle ? 'is-bundle' : ''}`}>
      <button
        type="button"
        className="app-card-title"
        aria-haspopup="dialog"
        onClick={onSelect}
      >
        <span className={`app-icon ${app.iconColor}`} aria-hidden="true">{app.iconText}</span>
        <span>
          <h3>
            {app.name}
            {isBundle && <span className="app-badge bundle">Bundle</span>}
          </h3>
          <span className="author">{app.author}</span>
        </span>
      </button>
      <p>{app.shortDescription}</p>
      {isBundle && app.includes && app.includes.length > 0 && (
        <ul className="app-card-includes">
          {app.includes.map((cid) => {
            const c = appsStore.getById(cid);
            if (!c) return null;
            return (
              <li key={cid}>
                <span className={`app-icon-mini ${c.iconColor}`} aria-hidden="true">{c.iconText}</span>
                {c.name}
              </li>
            );
          })}
        </ul>
      )}
      {showRelHint && (
        <div className="app-card-rel">
          {conflicts.length > 0 && (
            <span className="app-badge danger">
              {String(t('apps.relations.conflict-active', { name: conflicts[0].name }))}
            </span>
          )}
          {conflicts.length === 0 && missingReq.length > 0 && (
            <span className="app-badge warn">
              {String(t('apps.relations.needed-not-installed', { name: missingReq[0].name }))}
            </span>
          )}
        </div>
      )}
      <div className="app-card-foot">
        <StatusBadges app={app} t={t} />
        <span className="app-ver">v{app.installedVersion || app.latestVersion} · {app.size}</span>
      </div>
    </article>
  );
});

const RelationRow = observer(({ id, action }: { id: string; action: 'open' }) => {
  const a = appsStore.getById(id);
  if (!a) return null;
  const isInstalled = appsStore.isInstalled(a.id);
  return (
    <li className="apps-rel-row">
      <span className={`app-icon-mini ${a.iconColor}`} aria-hidden="true">{a.iconText}</span>
      <span className="apps-rel-name">{a.name}</span>
      {isInstalled ? (
        <span className="app-badge ok">✓</span>
      ) : (
        <Button
          variant="secondary"
          isOutlined
          label="→"
          aria-label={a.name}
          onClick={() => action === 'open' && appsStore.select(a.id)}
        />
      )}
    </li>
  );
});

const RelationsBlock = observer(({ app }: { app: AppItem }) => {
  const { t } = useTranslation();
  const r = app.relations;
  const includes = app.kind === 'bundle' ? app.includes : undefined;
  if (!r && !includes) return null;
  const has = (xs?: string[]) => xs && xs.length > 0;
  if (!has(r?.requires) && !has(r?.recommends) && !has(r?.worksWith) && !has(r?.conflicts) && !has(includes)) return null;

  return (
    <>
      <h4>{t('apps.relations.title')}</h4>
      <div className="apps-rel">
        {has(includes) && (
          <div className="apps-rel-block">
            <h5>{t('apps.relations.includes')}</h5>
            <ul>{includes!.map((id) => <RelationRow key={id} id={id} action="open" />)}</ul>
          </div>
        )}
        {has(r?.requires) && (
          <div className="apps-rel-block req">
            <h5>{t('apps.relations.requires')}</h5>
            <ul>{r!.requires!.map((id) => <RelationRow key={id} id={id} action="open" />)}</ul>
          </div>
        )}
        {has(r?.recommends) && (
          <div className="apps-rel-block rec">
            <h5>{t('apps.relations.recommends')}</h5>
            <ul>{r!.recommends!.map((id) => <RelationRow key={id} id={id} action="open" />)}</ul>
          </div>
        )}
        {has(r?.worksWith) && (
          <div className="apps-rel-block">
            <h5>{t('apps.relations.works-with')}</h5>
            <ul>{r!.worksWith!.map((id) => <RelationRow key={id} id={id} action="open" />)}</ul>
          </div>
        )}
        {has(r?.conflicts) && (
          <div className="apps-rel-block conf">
            <h5>{t('apps.relations.conflicts')}</h5>
            <ul>{r!.conflicts!.map((id) => <RelationRow key={id} id={id} action="open" />)}</ul>
          </div>
        )}
      </div>
    </>
  );
});

const DepsDialog = observer(({
  app, isOpen, onClose, onConfirm,
}: {
  app: AppItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (extras: string[]) => void;
}) => {
  const { t } = useTranslation();
  const isBundle = app.kind === 'bundle';
  const conflicts = appsStore.activeConflicts(app.id);
  const requires = appsStore.missingRequires(app.id);
  const recommends = appsStore.pendingRecommends(app.id);
  const includes = isBundle && app.includes
    ? app.includes
        .map((id) => appsStore.getById(id))
        .filter((a): a is AppItem => !!a && !appsStore.isInstalled(a.id))
    : [];

  const candidates = isBundle ? includes : recommends;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(candidates.map((a) => a.id)));
    }
  }, [isOpen, app.id]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const totalMb =
    (app.kind === 'bundle' ? 0 : app.sizeMb) +
    requires.reduce((s, a) => s + a.sizeMb, 0) +
    candidates.filter((a) => selected.has(a.id)).reduce((s, a) => s + a.sizeMb, 0);

  const blocked = conflicts.length > 0;
  const title = isBundle
    ? String(t('apps.deps-dialog.title-bundle', { name: app.name }))
    : String(t('apps.deps-dialog.title-install', { name: app.name }));

  return (
    <div className="apps-modal-back" role="presentation" onClick={onClose}>
      <div
        className="apps-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apps-modal-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="apps-drawer-close"
            onClick={onClose}
            aria-label={t('apps.buttons.close')}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="apps-modal-body">
          {blocked && (
            <div className="apps-alert danger" role="alert">
              <WarnIcon />
              <div>
                <b>{t('apps.deps-dialog.conflicts-block')}</b>
                <ul className="apps-modal-flatlist">
                  {conflicts.map((c) => <li key={c.id}>{c.name}</li>)}
                </ul>
              </div>
            </div>
          )}

          {requires.length > 0 && !blocked && (
            <section className="apps-modal-section req">
              <h5>{t('apps.deps-dialog.requires-block')}</h5>
              <ul className="apps-modal-list">
                {requires.map((a) => (
                  <li key={a.id}>
                    <span className={`app-icon-mini ${a.iconColor}`} aria-hidden="true">{a.iconText}</span>
                    <span className="apps-rel-name">{a.name}</span>
                    <span className="apps-modal-size">{a.size}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {candidates.length > 0 && !blocked && (
            <section className="apps-modal-section">
              <h5>{isBundle
                ? t('apps.deps-dialog.includes-block')
                : t('apps.deps-dialog.recommends-block')}</h5>
              <ul className="apps-modal-list">
                {candidates.map((a) => (
                  <li key={a.id}>
                    <label className="apps-modal-check">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggle(a.id)}
                      />
                      <span className={`app-icon-mini ${a.iconColor}`} aria-hidden="true">{a.iconText}</span>
                      <span className="apps-rel-name">{a.name}</span>
                      <span className="apps-modal-size">{a.size}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!blocked && (
            <div className="apps-modal-total">
              {String(t('apps.deps-dialog.size-total', { size: formatMb(totalMb) }))}
            </div>
          )}
        </div>
        <div className="apps-modal-foot">
          <Button
            variant="secondary"
            isOutlined
            label={t('apps.buttons.close')}
            onClick={onClose}
          />
          {!blocked && (
            <Button
              variant="primary"
              label={t('apps.deps-dialog.install-all')}
              onClick={() => {
                onConfirm(Array.from(selected));
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
});

const ActionAlert = observer(({ app }: { app: AppItem }) => {
  const { t } = useTranslation();
  if (app.status === 'installing') {
    return (
      <div className="apps-alert info" role="status" aria-live="polite">
        <SpinnerIcon />
        <div>{t('apps.alerts.in-progress')}</div>
      </div>
    );
  }
  if (app.lastResult === 'success' && app.lastMessage) {
    return (
      <div className="apps-alert success" role="status" aria-live="polite">
        <CheckIcon />
        <div>{app.lastMessage}</div>
      </div>
    );
  }
  if (app.lastResult === 'error' && app.lastMessage) {
    return (
      <div className="apps-alert danger" role="alert">
        <WarnIcon />
        <div>{app.lastMessage}</div>
      </div>
    );
  }
  return null;
});

const Drawer = observer(({ app, onClose }: { app: AppItem; onClose: () => void }) => {
  const { t } = useTranslation();
  const isInstalled = app.status === 'installed' || app.status === 'update_available';
  const isBusy = app.status === 'installing';
  const isBundle = app.kind === 'bundle';
  const conflicts = appsStore.activeConflicts(app.id);
  const requires = appsStore.missingRequires(app.id);
  const recommends = appsStore.pendingRecommends(app.id);
  const installablyBlocked = conflicts.length > 0;

  const [depsOpen, setDepsOpen] = useState(false);

  const [confirmUninstall, isConfirmOpened, handleConfirm, handleClose] = useConfirm();
  const [confirmRollback, isRollbackOpened, handleRollbackConfirm, handleRollbackClose, rollbackVersion] =
    useConfirm() as unknown as [
      (data: string) => Promise<string | null>,
      boolean,
      () => void,
      () => void,
      string | undefined,
    ];

  const requestUninstall = async () => {
    const ok = await (confirmUninstall as (data?: true) => Promise<true | null>)();
    if (ok) {
      appsStore.uninstall(app.id);
    }
  };

  const requestRollback = async (version: string) => {
    const ok = await confirmRollback(version);
    if (ok) {
      appsStore.rollback(app.id, version);
    }
  };

  const handleInstallClick = () => {
    if (installablyBlocked) {
      setDepsOpen(true);
      return;
    }
    if (isBundle || requires.length > 0 || recommends.length > 0) {
      setDepsOpen(true);
      return;
    }
    appsStore.install(app.id);
  };

  return (
    <>
      <div className="apps-drawer-back" onClick={onClose} />
      <aside className="apps-drawer" role="dialog" aria-modal="true" aria-label={app.name}>
        <div className="apps-drawer-head">
          <span className={`app-icon ${app.iconColor}`} aria-hidden="true">{app.iconText}</span>
          <div>
            <h2>{app.name}</h2>
            <div className="sub">
              {app.author} · v{app.installedVersion ? `${app.installedVersion} → ` : ''}{app.latestVersion}
            </div>
          </div>
          <button
            type="button"
            className="apps-drawer-close"
            onClick={onClose}
            aria-label={t('apps.buttons.close')}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="apps-drawer-body">
          <p>{app.description}</p>

          {installablyBlocked && (
            <div className="apps-alert danger" role="alert">
              <WarnIcon />
              <div>
                {String(t('apps.relations.conflict-active', { name: conflicts[0].name }))}
              </div>
            </div>
          )}

          {isInstalled && (
            <>
              <h4>{t('apps.drawer.parameters')}</h4>
              <div className="apps-row">
                <label htmlFor={`autostart-${app.id}`}>{t('apps.drawer.autostart')}</label>
                <Switch
                  id={`autostart-${app.id}`}
                  value={!!app.autostart}
                  onChange={() => appsStore.toggleAutostart(app.id)}
                />
              </div>
              <div className="apps-row">
                <label htmlFor={`autoupdate-${app.id}`}>{t('apps.drawer.autoupdate')}</label>
                <Switch
                  id={`autoupdate-${app.id}`}
                  value={!!app.autoupdate}
                  onChange={() => appsStore.toggleAutoupdate(app.id)}
                />
              </div>
            </>
          )}

          <h4>{t('apps.drawer.info')}</h4>
          <div className="apps-meta">
            <div><span>{t('apps.drawer.version')}</span>{app.installedVersion ? `${app.installedVersion} → ` : ''}<b>{app.latestVersion}</b></div>
            <div><span>{t('apps.drawer.size')}</span>{app.size}</div>
            <div><span>{t('apps.drawer.author')}</span>{app.author}</div>
            <div><span>{t('apps.drawer.source')}</span>{app.source === 'official' ? t('apps.badges.official') : t('apps.badges.community')}</div>
          </div>

          <RelationsBlock app={app} />

          {isInstalled && app.versionHistory && app.versionHistory.length > 0 && (
            <>
              <h4>{t('apps.section.history')}</h4>
              <p className="apps-history-sub">{t('apps.history.subtitle')}</p>
              <ul className="apps-history">
                {app.versionHistory.map((v) => {
                  const isCurrent = v.version === app.installedVersion;
                  const isLatest = v.version === app.latestVersion;
                  return (
                    <li key={v.version} className={isCurrent ? 'current' : ''}>
                      <div className="apps-history-row">
                        <div className="apps-history-ver">
                          <b>v{v.version}</b>
                          {isCurrent && <span className="apps-history-tag current">{t('apps.drawer.current')}</span>}
                          {isLatest && !isCurrent && <span className="apps-history-tag new">{t('apps.badges.update')}</span>}
                          <span className="apps-history-date">{v.date}</span>
                        </div>
                        {!isCurrent && (
                          <Button
                            variant={isLatest ? 'primary' : 'secondary'}
                            isOutlined={!isLatest}
                            disabled={isBusy}
                            label={String(t('apps.buttons.rollback', { v: v.version }))}
                            aria-haspopup="dialog"
                            onClick={() => requestRollback(v.version)}
                          />
                        )}
                      </div>
                      {v.notes && <p className="apps-history-notes">{v.notes}</p>}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* Алерты loading/success/error — внутри формы перед футером с кнопками. */}
          <ActionAlert app={app} />
        </div>
        <div className="apps-drawer-foot">
          {isInstalled && (
            <Button
              variant="danger"
              isOutlined
              isLoading={isBusy}
              disabled={isBusy}
              label={t('apps.buttons.uninstall')}
              onClick={requestUninstall}
              aria-haspopup="dialog"
            />
          )}
          {app.status === 'update_available' && (
            <Button
              variant="primary"
              isLoading={isBusy}
              disabled={isBusy}
              label={String(t('apps.buttons.update-to', { v: app.latestVersion }))}
              onClick={() => appsStore.update(app.id)}
            />
          )}
          {app.status === 'not_installed' && (
            <Button
              variant="primary"
              isLoading={isBusy}
              disabled={isBusy || installablyBlocked}
              label={isBundle ? String(t('apps.deps-dialog.install-all')) : t('apps.buttons.install')}
              onClick={handleInstallClick}
            />
          )}
        </div>
      </aside>

      <DepsDialog
        app={app}
        isOpen={depsOpen}
        onClose={() => setDepsOpen(false)}
        onConfirm={(extras) => appsStore.installWithDeps(app.id, extras)}
      />

      <Confirm
        isOpened={!!isConfirmOpened}
        variant="danger"
        heading={t('apps.confirm.uninstall-title')}
        acceptLabel={t('apps.buttons.uninstall')}
        confirmCallback={handleConfirm as () => void}
        closeCallback={handleClose as () => void}
      >
        {String(t('apps.confirm.uninstall-body', { name: app.name }))}
      </Confirm>

      <Confirm
        isOpened={!!isRollbackOpened}
        variant="primary"
        heading={t('apps.confirm.rollback-title')}
        acceptLabel={String(t('apps.buttons.rollback', { v: rollbackVersion ?? '' }))}
        confirmCallback={handleRollbackConfirm}
        closeCallback={handleRollbackClose}
      >
        {String(t('apps.confirm.rollback-body', { v: rollbackVersion ?? '', name: app.name }))}
      </Confirm>
    </>
  );
});

const StatsBanner = observer(() => {
  const { t } = useTranslation();
  const { installedCount, updatesCount, apps, disk } = appsStore;
  const usedPct = Math.min(100, Math.round(((disk.totalMb - disk.freeMb) / disk.totalMb) * 100));
  return (
    <section className="apps-stats" aria-label={t('apps.title')}>
      <div className="apps-stat">
        <span className="apps-stat-num">{installedCount}</span>
        <span className="apps-stat-lbl">{t('apps.stats.installed')}</span>
      </div>
      <div className="apps-stat">
        <span className={`apps-stat-num ${updatesCount ? 'warn' : ''}`}>{updatesCount}</span>
        <span className="apps-stat-lbl">{t('apps.stats.updates')}</span>
      </div>
      <div className="apps-stat">
        <span className="apps-stat-num">{apps.length}</span>
        <span className="apps-stat-lbl">{t('apps.stats.catalog')}</span>
      </div>
      <div className="apps-stat apps-stat-disk">
        <div className="apps-stat-disk-head">
          <span className="apps-stat-lbl">{t('apps.stats.disk')}</span>
          <span className="apps-stat-disk-val">
            <b>{formatMb(disk.freeMb)}</b> {t('apps.stats.disk-of')} {formatMb(disk.totalMb)}
          </span>
        </div>
        <div
          className="apps-stat-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={usedPct}
          aria-label={t('apps.stats.disk')}
        >
          <span style={{ width: `${usedPct}%` }} />
        </div>
      </div>
    </section>
  );
});

const SourcesPanel = observer(() => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const onAdd = () => {
    if (!url.trim()) {
      setError(t('apps.sources.empty-form-error'));
      return;
    }
    appsStore.addSource(name, url);
    setName('');
    setUrl('');
    setError('');
  };

  return (
    <section className="apps-sources" aria-label={t('apps.section.sources')}>
      <header>
        <h2>{t('apps.sources.title')}</h2>
        <p>{t('apps.sources.subtitle')}</p>
      </header>
      <ul className="apps-sources-list">
        {appsStore.sources.map((s) => (
          <li key={s.id} className="apps-source-row">
            <div className="apps-source-info">
              <div className="apps-source-name">
                <b>{s.name}</b>
                {s.builtin && <span className="app-badge info">{t('apps.sources.builtin')}</span>}
              </div>
              <code className="apps-source-url">{s.url}</code>
            </div>
            <div className="apps-source-actions">
              <label htmlFor={`src-${s.id}`} className="apps-sr-only">{t('apps.sources.enabled')}</label>
              <Switch
                id={`src-${s.id}`}
                value={s.enabled}
                onChange={() => appsStore.toggleSource(s.id)}
              />
              {!s.builtin && (
                <Button
                  variant="danger"
                  isOutlined
                  label={t('apps.buttons.remove')}
                  onClick={() => appsStore.removeSource(s.id)}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      <form
        className="apps-source-form"
        onSubmit={(e) => { e.preventDefault(); onAdd(); }}
      >
        <h4>{t('apps.buttons.add-source')}</h4>
        <div className="apps-source-form-row">
          <input
            type="text"
            placeholder={t('apps.sources.name-placeholder')}
            aria-label={t('apps.sources.name-placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder={t('apps.sources.url-placeholder')}
            aria-label={t('apps.sources.url-placeholder')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <Button
            variant="primary"
            type="submit"
            label={t('apps.buttons.add-source')}
          />
        </div>
        {error && (
          <div className="apps-alert danger" role="alert">
            <WarnIcon />
            <div>{error}</div>
          </div>
        )}
      </form>
    </section>
  );
});

const AppsPage = observer(() => {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('apps');
  const [filter, setFilter] = useState<Filter>('all');
  const [category, setCategory] = useState<AppCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: appsStore.apps.length };
    CATEGORIES.forEach((c) => {
      if (c.id !== 'all') {
        out[c.id] = appsStore.apps.filter((a) => a.category === c.id).length;
      }
    });
    return out;
  }, [appsStore.apps]);

  const filtered = useMemo(() => {
    let list = appsStore.apps;
    if (filter === 'installed') {
      list = list.filter((a) => a.status === 'installed' || a.status === 'update_available');
    } else if (filter === 'updates') {
      list = list.filter((a) => a.status === 'update_available');
    }
    if (category !== 'all') {
      list = list.filter((a) => a.category === category);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) => a.name.toLowerCase().includes(q) || a.shortDescription.toLowerCase().includes(q)
      );
    }
    return list;
  }, [appsStore.apps, filter, category, query]);

  const updates = filtered.filter((a) => a.status === 'update_available');
  const others = filtered.filter((a) => a.status !== 'update_available');

  const selected = appsStore.selected;

  return (
    <PageLayout title={t('apps.title')} hasRights>
      <div className="apps-page">
        <StatsBanner />
        <div className="apps-layout">
          <aside className="apps-sidebar" aria-label={t('apps.sidebar.overview')}>
            <h4>{t('apps.sidebar.overview')}</h4>
            <button
              type="button"
              className="apps-sidebar-btn"
              aria-pressed={view === 'apps' && filter === 'all'}
              onClick={() => { setView('apps'); setFilter('all'); }}
            >
              <span>{t('apps.sidebar.all')}</span>
              <span className="count">{appsStore.apps.length}</span>
            </button>
            <button
              type="button"
              className="apps-sidebar-btn"
              aria-pressed={view === 'apps' && filter === 'installed'}
              onClick={() => { setView('apps'); setFilter('installed'); }}
            >
              <span>{t('apps.sidebar.installed')}</span>
              <span className="count">{appsStore.installedCount}</span>
            </button>
            <button
              type="button"
              className="apps-sidebar-btn"
              aria-pressed={view === 'apps' && filter === 'updates'}
              onClick={() => { setView('apps'); setFilter('updates'); }}
            >
              <span>{t('apps.sidebar.updates')}</span>
              <span className={`count ${appsStore.updatesCount ? 'warn' : ''}`}>
                {appsStore.updatesCount}
              </span>
            </button>
            <button
              type="button"
              className="apps-sidebar-btn"
              aria-pressed={view === 'sources'}
              onClick={() => setView('sources')}
            >
              <span>{t('apps.open-sources')}</span>
              <span className="count">{appsStore.sources.length}</span>
            </button>

            {view === 'apps' && (
              <>
                <h4>{t('apps.sidebar.categories')}</h4>
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className="apps-sidebar-btn"
                    aria-pressed={category === c.id}
                    onClick={() => setCategory(c.id)}
                  >
                    <span>{t(c.key)}</span>
                    {c.id !== 'all' && <span className="count">{counts[c.id] || 0}</span>}
                  </button>
                ))}
              </>
            )}
          </aside>

          {view === 'sources' ? (
            <SourcesPanel />
          ) : (
            <div>
            <div className="apps-toolbar">
              <label className="apps-search">
                <span className="apps-sr-only">{t('apps.search-placeholder')}</span>
                <SearchIcon />
                <input
                  type="search"
                  aria-label={t('apps.search-placeholder')}
                  placeholder={t('apps.search-placeholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="apps-seg" role="group" aria-label={t('apps.seg.all')}>
                <button
                  type="button"
                  aria-pressed={filter === 'all'}
                  onClick={() => setFilter('all')}
                >
                  {t('apps.seg.all')}
                </button>
                <button
                  type="button"
                  aria-pressed={filter === 'installed'}
                  onClick={() => setFilter('installed')}
                >
                  {t('apps.seg.installed')}
                </button>
                <button
                  type="button"
                  aria-pressed={filter === 'updates'}
                  onClick={() => setFilter('updates')}
                >
                  {t('apps.seg.updates')}
                </button>
              </div>
            </div>

            {filter === 'all' && category === 'all' && !query && (
              <div className="apps-featured">
                {appsStore.apps
                  .filter((a) => a.featured)
                  .slice(0, 2)
                  .map((a, i) => (
                    <article key={a.id} className={`apps-feature ${i === 0 ? 'a' : 'b'}`}>
                      <span className="tag">
                        {a.status === 'update_available' ? t('apps.featured.update') : t('apps.featured.recommended')}
                      </span>
                      <div>
                        <h3>{a.name}</h3>
                        <p>{a.shortDescription}</p>
                      </div>
                      <div className="actions">
                        <Button
                          variant="primary"
                          aria-haspopup="dialog"
                          label={a.status === 'not_installed' ? t('apps.buttons.install') : t('apps.buttons.details')}
                          onClick={() => appsStore.select(a.id)}
                        />
                      </div>
                    </article>
                  ))}
              </div>
            )}

            {updates.length > 0 && (filter === 'updates' || filter === 'all') && (
              <>
                <div className="apps-section-head">
                  <h2>
                    {filter === 'updates'
                      ? t('apps.section.updates-only')
                      : String(t('apps.section.updates', { n: updates.length }))}
                  </h2>
                  {updates.length > 1 && (
                    <Button
                      variant="primary"
                      isLoading={appsStore.bulkUpdating}
                      disabled={appsStore.bulkUpdating}
                      label={String(t('apps.buttons.update-all', { n: updates.length }))}
                      onClick={() => appsStore.updateAll()}
                    />
                  )}
                </div>
                <div className="apps-grid">
                  {updates.map((a) => (
                    <Card key={a.id} app={a} onSelect={() => appsStore.select(a.id)} />
                  ))}
                </div>
              </>
            )}

            {filter !== 'updates' && (
              <>
                <div className="apps-section-head">
                  <h2>
                    {filter === 'installed'
                      ? t('apps.section.installed')
                      : t('apps.section.all')}
                  </h2>
                </div>
                {others.length === 0 ? (
                  <div className="apps-empty">{t('apps.empty')}</div>
                ) : (
                  <div className="apps-grid">
                    {others.map((a) => (
                      <Card key={a.id} app={a} onSelect={() => appsStore.select(a.id)} />
                    ))}
                  </div>
                )}
              </>
            )}

            {filter === 'updates' && updates.length === 0 && (
              <div className="apps-empty">{t('apps.empty')}</div>
            )}
            </div>
          )}
        </div>

        {selected && <Drawer app={selected} onClose={() => appsStore.select(null)} />}
      </div>
    </PageLayout>
  );
});

export default AppsPage;
