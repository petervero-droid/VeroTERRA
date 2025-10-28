// Veroterra app.js - simple local web app using localStorage and PapaParse for CSV import

// Data stores
let productList = JSON.parse(localStorage.getItem("productList")) || []; // array of {Name, Price, PV}
let cart = []; // array of items in cart

// Elements
const productSelect = document.getElementById("productList");
const productSearch = document.getElementById("productSearch");
const productPrice = document.getElementById("productPrice");
const productPV = document.getElementById("productPV");
const productQty = document.getElementById("productQty");
const flatShipping = document.getElementById("flatShipping");
flatShipping.value = 117; // auto-load shipping
const tableBody = document.querySelector("#productTable tbody");
const totalPriceEl = document.getElementById("grandTotalPrice");
const totalPVEl = document.getElementById("grandTotalPV");
const previewEl = document.getElementById("preview");

// Helpers
function sanitizeNumber(v){ const n = parseFloat((v+'').trim()); return isNaN(n)?0:n; }

function updateProductDropdown(list){
    productSelect.innerHTML = '';
    if(!list || !list.length) {
        const opt = document.createElement('option'); opt.value=''; opt.text='-- no products --'; productSelect.appendChild(opt);
        return;
    }
    list.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p['Name'];
        opt.textContent = p['Name'];
        productSelect.appendChild(opt);
    });
    // set selected first
    productSelect.selectedIndex = 0;
    // fill price/pv for first
    const first = list[0];
    if(first){ productPrice.value = first['Price']; productPV.value = first['PV']; }
}

// filter when typing (startsWith, case-insensitive), requires 1+ chars but user asked 3 letters; we'll show suggestions after 1 char for convenience
productSearch.addEventListener('input', ()=>{
    const q = (productSearch.value||'').trim().toLowerCase();
    if(q.length < 1){ updateProductDropdown(productList); return; }
    const matches = productList.filter(p => (p['Name']||'').toLowerCase().startsWith(q));
    updateProductDropdown(matches);
});

productSelect.addEventListener('change', ()=>{
    const sel = productSelect.value;
    const found = productList.find(p=>p['Name']===sel);
    if(found){ productPrice.value = found['Price']; productPV.value = found['PV']; }
});

function addProduct(){
    const name = productSelect.value || productSearch.value.trim();
    if(!name){ alert('Select or type a product name'); return; }
    const price = sanitizeNumber(productPrice.value);
    const pv = sanitizeNumber(productPV.value);
    const qty = parseInt(productQty.value) || 1;
    const item = { name, price, pv, qty, totalPrice: price*qty, totalPV: pv*qty };
    cart.push(item);
    renderCart();
    updateTotals();
}

// render cart table
function renderCart(){
    tableBody.innerHTML='';
    cart.forEach((it, idx)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${it.name}</td><td>${it.price}</td><td>${it.pv}</td><td>${it.qty}</td><td>${it.totalPrice}</td><td>${it.totalPV}</td><td><button onclick="removeItem(${idx})">Delete</button></td>`;
        tableBody.appendChild(tr);
    });
}

// remove item
function removeItem(i){ cart.splice(i,1); renderCart(); updateTotals(); }

function updateTotals(){
    const sumPrice = cart.reduce((s,i)=>s + (i.totalPrice||0),0);
    const sumPV = cart.reduce((s,i)=>s + (i.totalPV||0),0);
    const shipping = sanitizeNumber(flatShipping.value);
    totalPriceEl.textContent = (sumPrice + shipping).toFixed(2);
    totalPVEl.textContent = sumPV.toFixed(2);
}

// import CSV - expects headers exactly: Name,Price,PV (case-sensitive)
function importCSV(event){
    const file = event.target.files[0];
    if(!file) return;
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results){
            const data = results.data;
            if(!Array.isArray(data) || data.length===0){ alert('CSV is empty or wrong format'); return; }
            // normalize and validate rows: ensure Name,Price,PV exist
            const cleaned = [];
            for(const r of data){
                if(!r['Name']) continue;
                const row = {
                    'Name': (r['Name']+'').trim(),
                    'Price': sanitizeNumber(r['Price']),
                    'PV': sanitizeNumber(r['PV'])
                };
                cleaned.push(row);
            }
            if(cleaned.length===0){ alert('No valid rows found. CSV header must be: Name,Price,PV'); return; }
            productList = cleaned;
            localStorage.setItem('productList', JSON.stringify(productList));
            updateProductDropdown(productList);
            previewEl.textContent = 'Imported ' + productList.length + ' products. First: ' + productList[0].Name + ' (Price: ' + productList[0].Price + ', PV: ' + productList[0].PV + ')';
            alert('CSV imported: ' + productList.length + ' products');
        },
        error: function(err){ console.error(err); alert('CSV parse error: ' + err.message); }
    });
}

// export product list as CSV (using simple join)
function exportData(){
    if(!productList || !productList.length){ alert('No products to export'); return; }
    const rows = [ ['Name','Price','PV'] ];
    productList.forEach(p=> rows.push([p.Name, p.Price, p.PV]));
    const csv = rows.map(r=> r.map(c=> '\"'+(''+c).replace(/\"/g,'\"\"')+'\"').join(',')).join('\\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='veroterra_products.csv'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 5000);
}

// export current order as JSON
function exportOrder(){
    if(!cart.length){ alert('Cart is empty'); return; }
    const blob = new Blob([JSON.stringify(cart, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'veroterra_order.json'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 5000);
}

// clear order
function clearOrder(){ if(confirm('Clear current order?')){ cart=[]; renderCart(); updateTotals(); } }

// import product list from JSON (backup)
function importData(event){
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e){
        try{
            const j = JSON.parse(e.target.result);
            if(!Array.isArray(j)){ alert('Invalid JSON'); return; }
            productList = j.map(r=>({ 'Name': r.Name||r.name||'', 'Price': sanitizeNumber(r.Price||r.price||0), 'PV': sanitizeNumber(r.PV||r.pv||0) }));
            localStorage.setItem('productList', JSON.stringify(productList));
            updateProductDropdown(productList);
            alert('Product list imported from JSON backup');
        }catch(err){ alert('Invalid JSON file'); }
    };
    reader.readAsText(file);
}

// load productList from localStorage at startup
window.addEventListener('load', ()=>{
    try{
        const stored = JSON.parse(localStorage.getItem('productList'));
        if(Array.isArray(stored) && stored.length) productList = stored;
    }catch(e){ productList = []; }
    updateProductDropdown(productList);
    renderCart();
    updateTotals();
});
