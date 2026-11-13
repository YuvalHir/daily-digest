"""Small shared cache. No credentials; stop on provider blocks, never bypass."""
import json, math, sys
from datetime import datetime, timezone
from pathlib import Path
import yfinance as yf
SYMBOLS={'NASDAQ:NVDA':('NVDA','Nvidia'),'NASDAQ:MSFT':('MSFT','Microsoft'),'NASDAQ:AMD':('AMD','AMD'),'BITSTAMP:BTCUSD':('BTC-USD','Bitcoin')}
def number(x):
 v=float(x)
 if not math.isfinite(v):raise ValueError('Nonfinite market value')
 return v
def collect(previous=None):
 previous=previous or {}
 out={'schemaVersion':1,'fetchedAt':datetime.now(timezone.utc).isoformat(),'refreshMinutes':15,'quotes':{}}
 for key,(symbol,name) in SYMBOLS.items():
  try:
   ticker=yf.Ticker(symbol);bars=ticker.history(period='1d',interval='5m',auto_adjust=False);meta=ticker.history_metadata
   if bars.empty:raise ValueError('No bars')
   points=[number(v) for v in bars.Close.dropna().tolist()];price=number(meta['regularMarketPrice']);prior_close=number(meta.get('previousClose',meta['chartPreviousClose']));stamp=meta['regularMarketTime'];asof=stamp.to_pydatetime() if hasattr(stamp,'to_pydatetime') else datetime.fromtimestamp(stamp,timezone.utc)
   if asof.tzinfo is None:raise ValueError('Missing quote timezone')
   now=datetime.now(timezone.utc);status='delayed';period=meta.get('currentTradingPeriod',{}).get('regular',{});end=period.get('end');start=period.get('start')
   if symbol!='BTC-USD' and end is not None and (now>end.to_pydatetime() or now<start.to_pydatetime()):status='closed'
   out['quotes'][key]={'symbol':symbol,'name':name,'price':price,'currency':meta.get('currency','USD'),'changePercent':round((price/prior_close-1)*100,4),'points':points[-240:],'asOf':asof.isoformat(),'seriesAsOf':bars.index[-1].isoformat(),'sourceName':'Yahoo Finance · yfinance','sourceUrl':f'https://finance.yahoo.com/quote/{symbol}/','status':status,'timeframe':'1D','delayNote':'Cached every 15 minutes; source latency not guaranteed'}
  except Exception as error:
   print(f'{symbol}: unavailable: {type(error).__name__}: {str(error)[:180]}',file=sys.stderr)
   out['quotes'][key]=dict(previous.get('quotes',{}).get(key,{'unavailable':True,'symbol':symbol}),fetchError=True)
 if all(q.get('unavailable') for q in out['quotes'].values()):raise RuntimeError('All provider requests failed; retaining previous cache')
 return out
if __name__=='__main__':
 path=Path(sys.argv[1] if len(sys.argv)>1 else 'public/market.json');path.parent.mkdir(parents=True,exist_ok=True);previous=json.loads(path.read_text()) if path.exists() else {};path.write_text(json.dumps(collect(previous),ensure_ascii=False,allow_nan=False,indent=2)+'\n')
