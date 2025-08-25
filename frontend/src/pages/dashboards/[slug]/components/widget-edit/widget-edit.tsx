import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';
import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactSortable } from 'react-sortablejs';
import FileCodeIcon from '@/assets/icons/file-code.svg';
import FilelistIcon from '@/assets/icons/file-list.svg';
import MoveIcon from '@/assets/icons/move.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Confirm } from '@/components/confirm';
import { Dropdown, Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Switch } from '@/components/switch';
import { Textarea } from '@/components/textarea';
import { generateNextId } from '@/utils/id';
import type { CellSimple, WidgetEditProps } from './types';
import './styles.css';

export const WidgetEdit = ({ widget, cells, dashboard, controls, isOpened, onSave, onClose }: WidgetEditProps) => {
  const { t } = useTranslation();
  const [widgetCells, setWidgetCells] = useState<(CellSimple)[]>([]);
  const [isJsonView, setIsJsonView] = useState(false);
  const [name, setName] = useState(widget?.name);
  const [isCompactView, setIsCompactView] = useState(Boolean(widget?.compact));
  const [description, setDescription] = useState(widget?.description);
  const [code, setCode] = useState('');
  const hasInvertedColumn = useMemo(() => widgetCells.some((cell) => cell?.type === 'switch'), [widgetCells]);
  const isCodeValid = useMemo(() => {
    try {
      JSON.parse(code);
      return true;
    } catch (err) {
      return false;
    }
  }, [code]);

  useEffect(() => {
    setWidgetCells(widget.cells.map((cell) => ({ ...cell })));
    setName(widget.name);
    setIsCompactView(widget.compact);
  }, [widget.id]);

  useEffect(() => {
    if (!isJsonView) {
      setCode(JSON.stringify({
        name,
        description,
        compact: isCompactView,
        cells: widgetCells,
      }, null, 2));
    }
  }, [widget, name, description, isCompactView, isJsonView, widgetCells]);

  const removeCell = (id: string) => {
    setWidgetCells(widgetCells.filter((cell) => cell.id !== id));
  };

  const updateCell = (cellId: string, value: any) => {
    const updatedValue = widgetCells.map((widgetCell) =>
      cellId === widgetCell.id
        ? { ...widgetCell, ...value }
        : widgetCell
    );
    setWidgetCells(updatedValue);
  };

  useEffect(() => {
    if (!isJsonView) {
      return;
    }
    try {
      const data = JSON.parse(code);
      setName(data.name);
      setWidgetCells(data.cells);
      setDescription(data.description);
      setIsCompactView(data.compact);
    } catch (err) {
    }
  }, [code, isJsonView]);

  const controlsOptions = useMemo(() => {
    const uniqueSeparatorId = generateNextId(widgetCells.map((item) => item.id), 'separator');
    return [{ name: t('widget.labels.separator'), id:uniqueSeparatorId }, ...controls]
      .filter(({ id }) => !widgetCells.find((cell) => cell.id === id && !id.startsWith('separator')))
      .map(({ name, id }) => ({ label: name, value: id }));
  }, [widgetCells]);

  return (
    <Confirm
      className="widgetEdit"
      isOpened={isOpened}
      heading={widget.id ? `${t('widget.labels.edit')} ${widget.name}` : t('widget.labels.create')}
      closeCallback={onClose}
      isDisabled={!isCodeValid || !name}
      acceptLabel={t('widget.buttons.save')}
      headerActions={isJsonView
        ? (
          <FilelistIcon
            title={t('widget.buttons.editor')}
            className="widgetEdit-toggleViewIcon"
            onClick={() => setIsJsonView(!isJsonView)}
          />
        )
        : (
          <FileCodeIcon
            title={t('widget.buttons.edit-json')}
            className="widgetEdit-toggleViewIcon"
            onClick={() => setIsJsonView(!isJsonView)}
          />
        )
      }
      confirmCallback={() => {
        onSave({
          name,
          description,
          id: widget.id,
          cells: widgetCells,
          compact: isCompactView,
        });
      }}
      isPreventSubmit
    >
      <div className="widgetEdit-content">
        {isJsonView ? (
          <CodeMirror
            className="widgetEdit-codeEditor"
            value={code}
            style={{ height: '100%' }}
            height="100%"
            extensions={[json()]}
            onChange={(val) => setCode(val)}
          />
        ) : (
          <>
            {widget.associatedDashboards?.length > 1 && (
              <Alert className="widgetEdit-warn" variant="warn" withIcon={false}>
                {t('widget.labels.warning')}
                {widget.associatedDashboards
                  .filter((board) => board.id !== dashboard.id)
                  .map((dashboard) => (<li key={dashboard.id}>{dashboard.name}</li>))}
              </Alert>
            )}

            <div className="widgetEdit-fields">
              <Input
                className={classNames('widgetEdit-input', 'widgetEdit-name')}
                placeholder={t('widget.labels.name')}
                value={name}
                isDisabled={isJsonView}
                autoFocus
                onChange={(value: string) => setName(value)}
              />

              <Textarea
                className="widgetEdit-description"
                placeholder={t('widget.labels.description')}
                value={description}
                onChange={(value) => setDescription(value)}
              />

              <div className="widgetEdit-label">
                <div>{t('widget.labels.compact')}</div>
                <Switch id="compact" value={isCompactView} onChange={(value) => setIsCompactView(value)} />
              </div>
            </div>

            <div className="widgetEdit-controls">
              {!!widgetCells.length && (
                <div
                  className={classNames('widgetEdit-editedHeading', 'widgetEdit-editedCell', {
                    'widgetEdit-editedCellWithInverted': hasInvertedColumn,
                  })}
                >
                  <div></div>
                  <div className="widgetEdit-id">id</div>
                  <div>{t('widget.labels.name')}</div>
                  <div>{t('widget.labels.type')}</div>
                  {hasInvertedColumn && <div>{t('widget.labels.invert')}</div>}
                </div>
              )}

              <ReactSortable
                list={widgetCells}
                setList={(val) => {
                  if (val.length) {
                    setWidgetCells(val);
                  }
                }}
                handle=".widgetEdit-sortHandle"
                animation={150}
                className="widgetEdit-cellsContainer"
              >
                {widgetCells.map((cell) => (
                  <div
                    key={cell.id}
                    className={classNames('widgetEdit-editedCell', {
                      'widgetEdit-editedCellWithInverted': hasInvertedColumn,
                    })}
                  >
                    <div className="widgetEdit-sort">
                      {widgetCells.length > 1 && (
                        <MoveIcon className="widgetEdit-sortHandle widgetEdit-iconAction" />
                      )}
                    </div>
                    <div className="widgetEdit-id">{cell.id}</div>
                    <Input
                      className="widgetEdit-controlName"
                      value={cell.name}
                      placeholder={cells.get(cell.id)?.name}
                      onChange={(name: string) => updateCell(cell.id, { name })}
                    />
                    <div className="widgetEdit-type">
                      {cells.has(cell.id)
                        ? (cell.type || cells.get(cell.id)?.type)
                        : cell.id.startsWith('separator') ? 'separator' : 'incomplete'}
                    </div>
                    {hasInvertedColumn && (
                      <div className="widgetEdit-invert">
                        {cell.type === 'switch' && (
                          <Switch
                            id="inverted"
                            value={cell.extra?.invert}
                            onChange={(invert) => updateCell(cell.id, { extra: { invert } })}
                          />
                        )}
                      </div>
                    )}
                    <TrashIcon
                      className="widgetEdit-iconAction widgetEdit-remove"
                      onClick={() => removeCell(cell.id)}
                    />
                  </div>
                ))}
              </ReactSortable>
            </div>

            <Dropdown
              value={null}
              className="widgetEdit-dropdown"
              placeholder={t('widget.labels.add-control')}
              options={controlsOptions}
              isButton
              isSearchable
              onChange={(option: Option<string>) => {
                if (option) {
                  setWidgetCells([...widgetCells, {
                    id: option.value,
                    name: option.value.startsWith('separator')
                      ? t('widget.labels.separator')
                      : cells.get(option.value).name,
                    type: option.value.startsWith('separator') ? 'separator' : cells.get(option.value).type,
                    extra: {},
                  }]);
                }
              }}
            />
          </>
        )}
      </div>
    </Confirm>
  );
};
