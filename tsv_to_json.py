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


def make_new_config(old_config):
    old_config = old_config['config']
    config = {}

    new_dashboards = _format_dashboards(old_config['dashboards'])
    config['dashboards'] = new_dashboards
    
    default_dashboard = old_config.get('default_dashboard')
    if default_dashboard:
        config['defaultDashboardId'] = default_dashboard['uid']

    config['widgets'] = _format_widgets(old_config['widgets'])
    
    # Rooms are converted to dashboards
    config['dashboards'] += _format_rooms(old_config['rooms'], old_config['widgets'])

    return config

def _format_rooms(old_rooms, old_widgets):
    room_dashboards = []
    for room_uid, room in old_rooms.items():
        dashboard = {
            'name' : room['name'],
            'id'   : room['uid'],
            'isSvg': False,
            'widgets' : [],
        }

        for w in old_widgets.values():
            if w['room'] == room['uid']:
                dashboard['widgets'].append(w['uid'])
        
        room_dashboards.append(dashboard)
    return room_dashboards        


def _format_dashboards(dashboards):
    formated_dashboards = []
    widgets = []
    for key, old_dashboard in dashboards.items():
        d_widgets = old_dashboard['widgets']
        dashboard = {
            'id': old_dashboard['uid'],
            'isSvg': False,
            'widgets': [widget['uid'] for widget in d_widgets.values()],
            'name' : old_dashboard['name']
        }
        formated_dashboards.append(dashboard)
        
        
    return formated_dashboards


def _format_widgets(old_widgets):
    old_widgets_list = [old_widgets[k] for k in sorted(old_widgets.keys())]
    new_widgets = []
    for widget in old_widgets_list:
        updated_widget = {
            'name': widget.get('name'),
            'description': '',
            'compact': True,
            'id': widget.get('uid'),
            'cells': _controls_to_cells(widget.get('controls'))
        }
        new_widgets.append(updated_widget)
    return new_widgets


def _controls_to_cells(controls):
    cells = []
    if controls:
        for slot in controls.values():
            topic = slot.get('topic')
            if topic:
                _topic = topic[1:].split('/')
                cell = {}
                cell['id'] = '{0}/{1}'.format(_topic[1], _topic[-1])
                cells.append(cell)
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
        output_file.write(json.dumps(make_new_config(result), indent=4, sort_keys=True, ensure_ascii=False))


parser = argparse.ArgumentParser(
    description="""Generate json from tsv file.
    Example: python config_to_json.py config.wb5.tsv config.json"""
)
parser.add_argument("input", type=str, help="input file")
parser.add_argument("output", type=str, help="output file")
args = parser.parse_args()

run_script()