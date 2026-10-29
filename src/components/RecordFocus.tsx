import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
export function RecordFocus() {
  const location = useLocation();
  useEffect(() => {
    const params=new URLSearchParams(location.search);const id=params.get('step')??params.get('record');if(!id)return;
    let observer: MutationObserver | undefined;
    const focus=()=>{const element=document.getElementById(`record-${id}`);if(!element)return false;if(element instanceof HTMLDetailsElement)element.open=true;element.scrollIntoView({block:'center'});element.setAttribute('tabindex','-1');element.focus({preventScroll:true});observer?.disconnect();return true;};
    if(!focus()){observer=new MutationObserver(focus);observer.observe(document.body,{childList:true,subtree:true});}
    return()=>observer?.disconnect();
  },[location.pathname,location.search]);
  return null;
}