// Veroterra app.js - auto-loads CSV from GitHub Pages + local cart system

let productList = JSON.parse(localStorage.getItem("productList")) || [];
let cart = [];

const productSelect = document.getElementById("productList");
const productSearch = document.getElementById("productSearch");
const productPrice = document.getElementById("productPrice");
const productPV = document.getElementById("productPV");
const productQty = document.getElementById("productQty");
const flatShipping = document.getElementById("flatShipping");
flatShipping.value = 117;
const tableBody = document.querySelector("#productTable tbody");
const totalPriceEl = document.getElementById("grandTotalPrice");
const totalPVEl = document.getElementById("grandTotalPV");

// Helper
function sanitizeNumber(v) {
  const n = parseFloat((v + "").trim());
  return isNaN(n) ? 0 : n;
}

// Update dropdown
function updateProductDropdown(list) {
  productSelect.innerHTML = "";
  if (!list || !list.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.text = "-- no products --";
    productSelect.appendChild(opt);
    return;
  }
  list.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p["Name"];
    opt.textContent = p["Name"];
    productSelect.appendChild(opt);
  });
  productSelect.selectedIndex = 0;
  const first = list[0];
  if (first) {
    productPrice.value = first["Price"];
    productPV.value = first["PV"];
  }
}

// Search filter
productSearch.addEventListener("input", () => {
  const q = (productSearch.value || "").trim().toLowerCase();
  if (q.length < 1) {
    updateProductDropdown(productList);
    return;
  }
  const matches = productList.filter((p) =>
    (p["Name"] || "").toLowerCase().startsWith(q)
  );
  updateProductDropdown(matches);
});

// Update price/PV when selecting
productSelect.addEventListener("change", () => {
  const selName = productSelect.value;
  const sel = productList.find((p) => p.Name === selName);
  if (sel) {
    productPrice.value = sel.Price;
    productPV.value = sel.PV;
  }
});

// Add product to table
function addProduct() {
  const name = productSelect.value;
  const price = sanitizeNumber(productPrice.value);
  const pv = sanitizeNumber(productPV.value);
  const qty = sanitizeNumber(productQty.value);
  if (!name || qty <= 0) return;

  const totalPrice = price * qty;
  const totalPV = pv * qty;

  cart.push({ name, price, pv, qty, totalPrice, totalPV });
  renderTable();
}

// Render table and totals
function renderTable() {
  tableBody.innerHTML = "";
  let gPrice = 0,
    gPV = 0;
  cart.forEach((item, idx) => {
    gPrice += item.totalPrice;
    gPV += item.totalPV;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.price}</td>
      <td>${item.pv}</td>
      <td>${item.qty}</td>
      <td>${item.totalPrice}</td>
      <td>${item.totalPV}</td>
      <td><button onclick="removeItem(${idx})">X</button></td>
    `;
    tableBody.appendChild(row);
  });

  gPrice += sanitizeNumber(flatShipping.value);
  totalPriceEl.textContent = gPrice.toFixed(2);
  totalPVEl.textContent = gPV.toFixed(2);
}

// Remove product
function removeItem(i) {
  cart.splice(i, 1);
  renderTable();
}

// === AUTO LOAD CSV FROM GITHUB ===
function loadCSVFromGitHub() {
  const csvURL = "https://petervero-droid.github.io/VeroTERRA/products.csv";
  fetch(csvURL)
    .then((res) => {
      if (!res.ok) throw new Error("Network response not OK");
      return res.text();
    })
    .then((csvText) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            productList = results.data.map((row) => ({
              Name: row.Name?.trim(),
              Price: sanitizeNumber(row.Price),
              PV: sanitizeNumber(row.PV),
            }));
            localStorage.setItem("productList", JSON.stringify(productList));
            updateProductDropdown(productList);
            console.log("✅ Products loaded from GitHub CSV");
          } else {
            console.warn("⚠️ CSV empty, using local data");
            updateProductDropdown(productList);
          }
        },
      });
    })
    .catch((err) => {
      console.error("❌ Could not load CSV from GitHub:", err);
      updateProductDropdown(productList);
    });
}

// === Initialize ===
window.onload = () => {
  loadCSVFromGitHub();
};
