import argparse
import json
import re


def _generate_dict(path, value):
    result = None
    current_value = None
    for i in path[:-1]:
        if result is None:
            result = {i: dict()}
            current_value = result[i]
        elif current_value.get(i) is None:
            current_value[i] = dict()
            current_value = current_value[i]
    current_value[path[-1]] = value
    return result


def _merge_dicts(d1, d2):
    if d1 == d2:
        return d1
    d1_keys = set(d1.keys())
    d2_keys = set(d2.keys())
    is_same_keys = d2_keys.issubset(d1)
    if is_same_keys:
        key = next(iter(d1_keys & d2_keys))
        result = d1.copy()
        result[key] = _merge_dicts(d1.get(key), d2.get(key))
    else:
        copy = d1.copy()
        copy.update(d2)
        result = copy
    return result


def format_config(config):
    config = config['config']
    config.pop('rooms', None)
    dashboards, widgets = _format_dashboards(config['dashboards'])
    config['dashboards'] = dashboards
    default_dashboard = config.get('default_dashboard')

    if default_dashboard:
        update_value = {
            'id': 'default',
            'name': 'Default Dashboard (cfg)',
            'isSvg': False,
            'widgets': []
        }
        config['dashboards'].append(update_value)
        config.pop('default_dashboard')

    widgets = _format_widgets(widgets)
    config['widgets'] = widgets
    return config


def _format_dashboards(dashboards):
    formated_dashboards = []
    widgets = []
    for key in dashboards.keys():
        dashboard = dashboards[key]
        d_widgets = dashboard.pop('widgets')
        update_value = {
            'id': dashboard.pop('uid'),
            'isSvg': False,
            'widgets': [widget['uid'] for widget in d_widgets.values()]
        }
        dashboard.update(update_value)
        formated_dashboards.append(dashboard)
        widgets.extend([i for i in d_widgets.values()])
    return formated_dashboards, widgets


def _format_widgets(widgets):
    new_widgets = []
    for widget in widgets:
        updated_widget = {
            'description': '',
            'compact': False,
            'id': widget.get('uid'),
            'cells': _controls_to_cells(widget)
        }
        new_widgets.append(updated_widget)
    return new_widgets


def _controls_to_cells(widget):
    cells = []
    controls = widget.get('controls')
    if controls:
        for slot in controls.values():
            topic = slot.get('topic')
            if topic:
                _topic = topic['topic'][1:].split('/')
                topic['id'] = '{0}/{1}'.format(_topic[1], _topic[-1])
                topic.pop('topic')
                cells.append(topic)
    return cells


def run_script():
    """
    Generate json from tsv file.
    Example: python config_to_json.py config.wb5.tsv config.json
    """
    with open(args.input, 'r') as config_file:
        config = config_file.read()

    config_rows = config.split('\n')
    dicts = []
    for config_row in config_rows:

        if '\t' in config_row:
            path, value = config_row.split('\t')
        else:
            splited = re.split(r'\s+', config_row, maxsplit=1)
            if len(splited) != 2:
                continue
            path, value = splited

        dicts.append(_generate_dict([i for i in path.split('/') if i], value))

    result = dicts[0]
    for i in dicts[1:]:
        result = _merge_dicts(result, i)

    with open(args.output, 'w') as output_file:
        output_file.write(json.dumps(format_config(result), indent=4, sort_keys=True, ensure_ascii=False))


parser = argparse.ArgumentParser(
    description="""Generate json from tsv file.
    Example: python config_to_json.py config.wb5.tsv config.json"""
)
parser.add_argument("input", type=str, help="input file")
parser.add_argument("output", type=str, help="output file")
args = parser.parse_args()

run_script()