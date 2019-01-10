import argparse
import json
import sys


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

        try:
            path, value = config_row.split('\t')
        except ValueError:
            print('Broken tsv file (have no \\t) %s' % args.input)
            sys.exit(1)

        path = [i for i in path.split('/') if i]
        dicts.append(_generate_dict(path, value))

    result = dicts[0]
    for i in dicts[1:]:
        result = _merge_dicts(result, i)

    with open(args.output, 'w') as output_file:
        output_file.write(json.dumps(result, indent=4, sort_keys=True, ensure_ascii=False))


parser = argparse.ArgumentParser(
    description="""Generate json from tsv file.
    Example: python config_to_json.py config.wb5.tsv config.json"""
)
parser.add_argument("input", type=str, help="input file")
parser.add_argument("output", type=str, help="output file")
args = parser.parse_args()

run_script()