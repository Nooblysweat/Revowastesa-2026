(() => {
  const form = document.querySelector('#enquiry');
  const stages = [...form.querySelectorAll('[data-enquiry-step]')];
  const next = form.querySelector('#enquiry-next');
  const back = form.querySelector('#enquiry-back');
  const submit = form.querySelector('#enquiry-submit');
  const status = form.querySelector('#form-status');
  const endpoint = window.REVO_ENQUIRY_CONFIG?.endpoint?.trim() || '';
  const labels = {stream:'Waste type',location:'Location',quantity:'Quantity',message:'Details',name:'Name',company:'Company',email:'Email',phone:'Phone'};
  let step = 0, busy = false, requestId;
  const data = () => Object.fromEntries(new FormData(form));
  const validStage = i => [...stages[i].querySelectorAll('input,select,textarea')].every(el => el.reportValidity());
  const summary = () => Object.entries(labels).map(([key,label]) => `${label}: ${data()[key] || 'Not provided'}`).join('\n\n');
  function review() {
    const dl = form.querySelector('#enquiry-review'); dl.replaceChildren();
    Object.entries(labels).forEach(([key,label]) => {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = data()[key] || 'Not provided'; dl.append(dt,dd);
    });
  }
  function show(i) {
    step = i; stages.forEach((el,n) => el.hidden = n !== i);
    form.querySelectorAll('.enquiry-progress li').forEach((el,n) => {el.classList.toggle('complete',n<i);if(n===i)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    back.hidden = i === 0; next.hidden = i === 2; submit.hidden = i !== 2;
    status.textContent = ''; if(i===2) review();
    const legend = stages[i].querySelector('legend'); legend.tabIndex = -1; legend.focus({preventScroll:true});
  }
  next.addEventListener('click',() => {if(validStage(step)) show(step+1);});
  back.addEventListener('click',() => show(step-1));
  form.addEventListener('input',() => { requestId = undefined; form.querySelector('#message-count').textContent = `${form.elements.message.value.length} / 3000`; });
  function download() {
    const url = URL.createObjectURL(new Blob(['RevoWaste enquiry\nPrepared copy. This file is not proof of submission.\n\n'+summary()],{type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url;a.download='My_RevoWaste_Enquiry.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  form.querySelector('#download-enquiry').addEventListener('click',download);
  if(endpoint) form.querySelector('#enquiry-mode').textContent = 'Complete your enquiry here. No email app needed.';
  else submit.textContent = 'Save my enquiry';
  form.addEventListener('submit',async event => {
    event.preventDefault();if(busy)return;
    if(step<2){if(validStage(step))show(step+1);return;}
    for(let i=0;i<3;i++){if(![...stages[i].querySelectorAll('input,select,textarea')].every(el=>el.checkValidity())){show(i);validStage(i);return;}}
    if(!endpoint){download();status.textContent='Your copy is ready. Nothing has been sent. Online delivery is being set up. For help now, call +27 67 701 3531 or contact gareth@revowaste.co.za.';return;}
    busy=true;submit.disabled=true;back.disabled=true;submit.textContent='Sending…';form.setAttribute('aria-busy','true');status.textContent='Sending your enquiry…';
    const controller = new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
    try {
      requestId ||= crypto.randomUUID();
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data(),consent:form.elements.consent.checked,requestId}),signal:controller.signal});
      const result=await response.json();
      if(!response.ok || result.accepted!==true)throw new Error('Submission not confirmed');
      stages.forEach(el=>el.hidden=true);form.querySelector('.enquiry-actions').hidden=true;form.querySelector('.enquiry-progress').hidden=true;
      status.classList.add('enquiry-success');status.textContent='Thank you. Your enquiry has been received. RevoWaste will contact you using the details you provided.';
    } catch(error) {
      status.textContent='We could not confirm delivery. Your details are still here. Please try again, download a copy, or call +27 67 701 3531.';
    } finally {clearTimeout(timer);busy=false;submit.disabled=false;back.disabled=false;submit.textContent='Send enquiry →';form.removeAttribute('aria-busy');}
  });
})();
