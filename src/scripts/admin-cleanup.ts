const message=document.querySelector<HTMLElement>('#cleanup-message')!;
const retry=document.querySelector<HTMLButtonElement>('#cleanup-images')!;
const params=new URLSearchParams(location.search);
if(params.has('deleted'))message.textContent=params.has('cleanup')?'Članak je obrisan, ali neke slike još čekaju brisanje. Kliknite „Dovrši čišćenje slika”.':'Članak i sve njegove nedijeljene slike su obrisani.';
retry.addEventListener('click',async()=>{
  retry.disabled=true;message.textContent='Provjeravamo i brišemo preostale slike…';
  try{
    const response=await fetch('/api/admin/articles/',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({cleanupOnly:true})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Čišćenje nije uspjelo.');
    message.textContent=data.cleanupPending?'Dio slika je obrisan. Kliknite ponovno za preostale slike.':'Čišćenje je dovršeno. Nema slika koje čekaju brisanje.';
  }catch(error){message.textContent=error instanceof Error?error.message:'Pokušajte ponovno.';}
  finally{retry.disabled=false;}
});
