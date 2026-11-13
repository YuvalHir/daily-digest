import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {Locale,DigestEdition,DigestIndex} from '../types/digest';
export const loadDigestIndex=async():Promise<DigestIndex>=>JSON.parse(await readFile(resolve('public/data/index.json'),'utf8'));
export const loadEdition=async(date:string,slug:string):Promise<DigestEdition>=>JSON.parse(await readFile(resolve('public/data',date,slug+'.json'),'utf8'));
export const editionHref=(locale:Locale,date:string,slug?:string)=>'/'+[locale==='en'?'en':'',date,slug].filter(Boolean).join('/')+'/';
export const localTime=(value:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
export const localDate=(value:string,locale:Locale)=>new Intl.DateTimeFormat(locale==='he'?'he-IL':'en-GB',{timeZone:'Asia/Jerusalem',day:'numeric',month:'long',year:'numeric',weekday:'long'}).format(new Date(value+'T12:00:00+02:00'));
