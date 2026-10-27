document.querySelectorAll(".status-select").forEach(select=>select.addEventListener("change",()=>{select.dataset.changed="true";select.style.borderColor="#a35f59"}));
document.getElementById("designReview").addEventListener("click",event=>{event.currentTarget.textContent="Sample marked reviewed";event.currentTarget.disabled=true;event.currentTarget.style.opacity=".65"});
document.getElementById("dateButton").addEventListener("click",()=>window.alert("Date filters need a real analytics backend. This dashboard contains illustrative sample data."));
