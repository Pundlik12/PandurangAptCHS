import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let currentUser = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
  document.getElementById('auth-section').style.display = user ? 'none' : 'block';
  document.getElementById('app-section').style.display = user ? 'block' : 'none';
  if (user) {
    populateMonthFilters();
    loadIncome();
    loadExpense();
    loadDashboard();
  }
});

export function login() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  signInWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
}

export function register() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  createUserWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
}

export function logout() {
  signOut(auth);
}

export function showForm(type) {
  document.querySelectorAll('.form-section').forEach(div => div.classList.remove('active'));
  document.getElementById(`${type}-form`).classList.add('active');
  if (type === 'home') loadDashboard();
}

export async function submitIncome() {
  const date = document.getElementById('income-date').value;
  const amount = parseFloat(document.getElementById('income-amount').value);
  const source = document.getElementById('income-source').value;
  if (date && amount && source) {
    await addDoc(collection(db, "income"), { date, amount, source, userId: currentUser.uid });
    loadIncome();
  }
}

export async function submitExpense() {
  const date = document.getElementById('expense-date').value;
  const amount = parseFloat(document.getElementById('expense-amount').value);
  const category = document.getElementById('expense-category').value;
  if (date && amount && category) {
    await addDoc(collection(db, "expense"), { date, amount, category, userId: currentUser.uid });
    loadExpense();
  }
}

export async function loadIncome() {
  const month = document.getElementById('income-month-filter').value;
  let q = query(collection(db, "income"), where("userId", "==", currentUser.uid));
  if (month) {
    q = query(q, where("date", ">=", `${month}-01`), where("date", "<=", `${month}-31`));
  }
  const snapshot = await getDocs(query(q, orderBy("date", "desc")));
  const tbody = document.querySelector("#income-table tbody");
  tbody.innerHTML = "";
  snapshot.forEach(doc => {
    const { date, amount, source } = doc.data();
    tbody.innerHTML += `<tr><td>${date}</td><td>${amount}</td><td>${source}</td></tr>`;
  });
}

export async function loadExpense() {
  const month = document.getElementById('expense-month-filter').value;
  let q = query(collection(db, "expense"), where("userId", "==", currentUser.uid));
  if (month) {
    q = query(q, where("date", ">=", `${month}-01`), where("date", "<=", `${month}-31`));
  }
  const snapshot = await getDocs(query(q, orderBy("date", "desc")));
  const tbody = document.querySelector("#expense-table tbody");
  tbody.innerHTML = "";
  snapshot.forEach(doc => {
    const { date, amount, category } = doc.data();
    tbody.innerHTML += `<tr><td>${date}</td><td>${amount}</td><td>${category}</td></tr>`;
  });
}

export async function loadDashboard() {
  const incomeSnap = await getDocs(query(collection(db, "income"), where("userId", "==", currentUser.uid)));
  const expenseSnap = await getDocs(query(collection(db, "expense"), where("userId", "==", currentUser.uid)));

  let totalIncome = 0, totalExpense = 0;
  const monthlyIncome = {}, monthlyExpense = {}, categoryTotals = {};

  incomeSnap.forEach(doc => {
    const { date, amount } = doc.data();
    totalIncome += amount;
    const month = date.slice(0, 7);
    monthlyIncome[month] = (monthlyIncome[month] || 0) + amount;
  });

  expenseSnap.forEach(doc => {
    const { date, amount, category } = doc.data();
    totalExpense += amount;
    const month = date.slice(0, 7);
    monthlyExpense[month] = (monthlyExpense[month] || 0) + amount;
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
  });

  renderSummaryChart(totalIncome, totalExpense);
  renderTrendChart(monthlyIncome, monthlyExpense);
  renderCategoryChart(categoryTotals);
}

function renderSummaryChart(income, expense) {
  const ctx = document.getElementById('summaryChart').getContext('2d');
  if (window.summaryChartInstance) window.summaryChartInstance.destroy();
  window.summaryChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expense'],
      datasets: [{
        label: 'Total',
        data: [income, expense],
        backgroundColor: ['#28a745', '#dc3545']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Total Income vs Expense' }
      }
    }
  });
}

function renderTrendChart(incomeData, expenseData) {
  const months = Array.from(new Set([...Object.keys(incomeData), ...Object.keys(expenseData)])).sort();
  const incomeValues = months.map(m => incomeData[m] || 0);
  const expenseValues = months.map(m => expenseData[m] || 0);

  const ctx = document.getElementById('trendChart').getContext('2d');
  if (window.trendChartInstance) window.trendChartInstance.destroy();
  window.trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Income',
          data: incomeValues,
          borderColor: '#28a745',
          backgroundColor: '#28a74533',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Expense',
          data: expenseValues,
          borderColor: '#dc3545',
          backgroundColor: '#dc354533',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Monthly Income & Expense Trends' }
      }
    }
  });
}

function renderCategoryChart(data) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  if (window.categoryChartInstance) window.categoryChartInstance.destroy();

  const labels = Object.keys(data);
  const values = Object.values(data);
  const colors = labels.map((_, i) => `hsl(${i * 40}, 70%, 60%)`);

  window.categoryChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Expense by Category' },
        legend: { position: 'bottom' }
      }
    }
  });
}

export async function exportIncome() {
  const snapshot = await getDocs(query(collection(db, "income"), where("userId", "==", currentUser.uid)));
  let csv = "Date,Amount,Source\n";
  snapshot.forEach(doc => {
    const { date, amount, source } = doc.data();
    csv += `${date},${amount},${source}\n`;
  });
  downloadCSV(csv, "income.csv");
}

  export async function exportExpense() {
    const snapshot = await getDocs(query(collection(db, "expense"), where("userId", "==", currentUser.uid)));
    let csv = "Date,Amount,Category\n";
    snapshot.forEach(doc => {
      const { date, amount, category } = doc.data();
      csv += `${date},${amount},${category}\n`;
    });
    downloadCSV(csv, "expense.csv");
  }

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  export async function checkBudget() {
    const budget = parseFloat(document.getElementById('monthly-budget').value);
    if (!budget) return;

    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const snapshot = await getDocs(query(
      collection(db, "expense"),
      where("userId", "==", currentUser.uid),
      where("date", ">=", `${month}-01`),
      where("date", "<=", `${month}-31`)
    ));

    let totalExpense = 0;
    snapshot.forEach(doc => {
      totalExpense += doc.data().amount;
    });

    const warning = document.getElementById('budget-warning');
    if (totalExpense > budget) {
      warning.textContent = `⚠️ You've exceeded your budget by ₹${(totalExpense - budget).toFixed(2)}`;
    } else {
      warning.textContent = `✅ You're within budget. ₹${(budget - totalExpense).toFixed(2)} remaining.`;
    }
  }

  export function populateMonthFilters() {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.toISOString().slice(0, 7);
      months.push(m);
    }

    const incomeFilter = document.getElementById('income-month-filter');
    const expenseFilter = document.getElementById('expense-month-filter');
    months.forEach(m => {
      const opt1 = document.createElement("option");
      opt1.value = m;
      opt1.textContent = m;
      incomeFilter.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = m;
      opt2.textContent = m;
      expenseFilter.appendChild(opt2);
    });
  }