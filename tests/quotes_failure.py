"""Offline regression check: refresh failures never erase last-good quotes."""
import importlib.util,json
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('quotes',Path(__file__).parents[1]/'scripts/update-quotes.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
old=json.loads((Path(__file__).parents[1]/'public/market.json').read_text())
with patch.object(module.yf,'Ticker',side_effect=RuntimeError('offline test')):
 result=module.collect(old)
for key in old['quotes']:
 assert result['quotes'][key]['price']==old['quotes'][key]['price']
 assert result['quotes'][key]['asOf']==old['quotes'][key]['asOf']
 assert result['quotes'][key]['fetchError']
print('PASS all provider failures retain last-good prices and source timestamps')
