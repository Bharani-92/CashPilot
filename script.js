// ============================================================
// CASH PILOT - MAIN JAVASCRIPT
// ============================================================

// ============================================================
// DATE HELPERS
// ============================================================
function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return dateToStr(d);
}

// ============================================================
// FAMILIES (CUSTOMERS)
// ============================================================
let families = JSON.parse(localStorage.getItem('families')) || [];

function saveFamilies() {
  localStorage.setItem('families', JSON.stringify(families));
}

function addFamily(familyName, studentName, fee) {
  families.push({
    id: Date.now(),
    familyName: familyName,
    studentName: studentName,
    fee: Number(fee)
  });
  saveFamilies();
}

function deleteFamily(id) {
  families = families.filter(f => f.id !== id);

  // Remove expected fees linked to the deleted family
  expectedFees = expectedFees.filter(f => f.familyId !== id);
  saveExpectedFees();

  saveFamilies();
}

function showCustomers() {
  setActiveTab('customers');

  const main = document.getElementById('main');

  main.innerHTML = `
    <h2>Customers</h2>

    <form id="familyForm">
      <input type="text" id="familyName"
        placeholder="Family name" required>

      <input type="text" id="studentName"
        placeholder="Student name" required>

      <input type="number" id="fee"
        placeholder="Monthly fee (₹)" min="1" required>

      <button type="submit">Add family</button>
    </form>

    <h3>Search customers</h3>

    <input type="search" id="customerSearch"
      placeholder="Search family or student name...">

    <p id="customerCount"></p>

    <ul id="familyList"></ul>
  `;

  function renderFamilies(searchText = '') {
    const list = document.getElementById('familyList');
    const count = document.getElementById('customerCount');

    list.innerHTML = '';

    const query = searchText.toLowerCase().trim();

    const filtered = families.filter(f =>
      f.familyName.toLowerCase().includes(query) ||
      f.studentName.toLowerCase().includes(query)
    );

    count.textContent =
      `Showing ${filtered.length} of ${families.length} customers`;

    if (filtered.length === 0) {
      const li = document.createElement('li');
      li.textContent = families.length === 0
        ? 'No customers added yet.'
        : 'No matching customers found.';

      list.appendChild(li);
      return;
    }

    filtered.forEach(f => {
      const li = document.createElement('li');

      li.textContent =
        `${f.familyName} (${f.studentName}): ₹${f.fee} per month `;

      const btn = document.createElement('button');
      btn.textContent = 'Delete';

      btn.addEventListener('click', () => {
        const hasInvoices = invoices.some(
          inv => inv.familyId === f.id
        );

        if (hasInvoices) {
          alert(
            'This family has invoices, so it cannot be deleted.'
          );
          return;
        }

        if (!confirm(`Permanently delete ${f.familyName}?`)) {
          return;
        }

        deleteFamily(f.id);
        showCustomers();
      });

      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  document.getElementById('familyForm')
    .addEventListener('submit', e => {
      e.preventDefault();

      addFamily(
        document.getElementById('familyName').value.trim(),
        document.getElementById('studentName').value.trim(),
        document.getElementById('fee').value
      );

      showCustomers();
    });

  document.getElementById('customerSearch')
    .addEventListener('input', e => {
      renderFamilies(e.target.value);
    });

  renderFamilies();
}

// ============================================================
// INVOICES
// ============================================================
let invoices = JSON.parse(localStorage.getItem('invoices')) || [];

function saveInvoices() {
  localStorage.setItem('invoices', JSON.stringify(invoices));
}

function createInvoice(familyId) {
  const family = families.find(f => f.id === familyId);
  if (!family) return;

  invoices.push({
    id: Date.now(),
    familyId: family.id,
    amount: family.fee,
    dueDate: todayDateStr(),
    status: 'unpaid'
  });

  saveInvoices();
}

function adjustCash(delta) {
  cashInHand = Math.round((cashInHand + delta) * 100) / 100;
  localStorage.setItem('cashInHand', cashInHand);
}

function markPaid(id) {
  const inv = invoices.find(i => i.id === id);

  if (!inv || inv.status === 'paid') return;

  inv.status = 'paid';
  inv.paidAt = todayDateStr();

  saveInvoices();
  adjustCash(inv.amount);
}

function showInvoices() {
    setActiveTab('invoices');

    const familyOptions = families.map(f =>
        `<option value="${f.id}">${f.familyName} - ${f.studentName}</option>`
    ).join('');

    main.innerHTML = `
        <section class="page-header">
            <h2>Invoices</h2>
            <p>Manage fees and track payments.</p>
        </section>

        <section class="card">
            <h3>Create Invoice</h3>
            <form id="invoiceForm">
                <label>Family</label>
                <select id="invoiceFamily" required>
                    <option value="">Select family</option>
                    ${familyOptions}
                </select>

                <label>Amount</label>
                <input type="number" id="invoiceAmount"
                    min="1" placeholder="Enter amount" required>

                <label>Due Date</label>
                <input type="date" id="invoiceDueDate" required>

                <button type="submit">Create Invoice</button>
            </form>
        </section>

        <section class="card">
            <h3>Invoice List</h3>

            <div class="invoice-filters">
                <button type="button" data-filter="all">All</button>
                <button type="button" data-filter="paid">Paid</button>
                <button type="button" data-filter="unpaid">Unpaid</button>
                <button type="button" data-filter="overdue">Overdue</button>
            </div>

            <div id="invoiceList"></div>
        </section>
    `;

    let currentFilter = 'all';

    function renderInvoices() {
        const today = todayDateStr();

        const filtered = invoices.filter(inv => {
            if (currentFilter === 'paid')
                return inv.status === 'paid';

            if (currentFilter === 'unpaid')
                return inv.status !== 'paid';

            if (currentFilter === 'overdue')
                return inv.status !== 'paid' && inv.dueDate < today;

            return true;
        });

        const rows = filtered.map(inv => {
            const family = families.find(f => f.id == inv.familyId);
            const familyName = family
                ? family.familyName
                : 'Deleted Family';

            return `
                <div class="invoice-row">
                    <p><strong>${familyName}</strong></p>
                    <p>Amount: ${formatMoney(inv.amount)}</p>
                    <p>Due: ${formatDisplayDate(inv.dueDate)}</p>
                    <p>Status: ${inv.status}</p>

                    ${inv.status !== 'paid' && family ? `
                        <button data-pay="${inv.id}">Mark Paid</button>
                        <button data-remind="${inv.id}">WhatsApp Reminder</button>
                    ` : ''}

                    ${!family ? `
                        <button data-remove="${inv.id}">Remove</button>
                    ` : ''}
                </div>
            `;
        }).join('');

        document.getElementById('invoiceList').innerHTML =
            filtered.length ? rows : '<p>No invoices found.</p>';
    }

    document.querySelectorAll('[data-filter]').forEach(button => {
        button.addEventListener('click', () => {
            currentFilter = button.dataset.filter;
            renderInvoices();
        });
    });

    document.getElementById('invoiceForm').addEventListener('submit', e => {
        e.preventDefault();

        const familyId = Number(document.getElementById('invoiceFamily').value);
        const amount = Number(document.getElementById('invoiceAmount').value);
        const dueDate = document.getElementById('invoiceDueDate').value;

        if (!familyId || amount <= 0 || !dueDate) return;

        const duplicate = invoices.some(inv =>
            inv.familyId == familyId &&
            inv.dueDate.slice(0, 7) === dueDate.slice(0, 7)
        );

        if (duplicate && !confirm('An invoice already exists for this family in this month. Create another?')) {
            return;
        }

        invoices.push({
            id: Date.now(),
            familyId,
            amount,
            dueDate,
            status: 'unpaid'
        });

        saveData();
        showInvoices();
    });

    document.getElementById('invoiceList').addEventListener('click', e => {
        const payId = e.target.dataset.pay;
        const removeId = e.target.dataset.remove;

        if (payId) {
            markPaid(Number(payId));
            showInvoices();
        }

        if (removeId) {
            if (confirm('Remove this invoice?')) {
                invoices = invoices.filter(inv => inv.id != removeId);
                saveData();
                showInvoices();
            }
        }
    });

    renderInvoices();
}
// ============================================================
// DASHBOARD
// ============================================================
function alertsHtml() {
  const todayStr = todayDateStr();

  const items = invoices
    .filter(inv => inv.status === 'unpaid' && inv.dueDate <= todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map(inv => {
      const family = families.find(f => f.id === inv.familyId);
      const name = family ? family.familyName : 'Deleted family';

      if (inv.dueDate < todayStr) {
        const days = Math.round(
          (new Date(todayStr + 'T00:00:00') -
           new Date(inv.dueDate + 'T00:00:00')) / 86400000
        );

        return `
          <li class="overdue">
            Chase today: ${name} owes ₹${inv.amount},
            overdue ${days} day(s), since ${inv.dueDate}.
            <button data-remind="${inv.id}">Remind on WhatsApp</button>
          </li>
        `;
      }

      return `
        <li>
          Due today: ${name} owes ₹${inv.amount}.
          <button data-remind="${inv.id}">Remind on WhatsApp</button>
        </li>
      `;
    })
    .join('');

  return `
    <h3>Alerts</h3>
    <ul>${items || '<li>No payments need action today.</li>'}</ul>
  `;
}

function formatMoney(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return 'Date unavailable';

  const date = new Date(dateStr + 'T00:00:00');

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
function cashFlowChartHtml() {
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    months.push({
      key,
      label: d.toLocaleDateString('en-IN', {
        month: 'short'
      }),
      income: 0,
      expenses: 0
    });
  }

  invoices
    .filter(inv => inv.status === 'paid')
    .forEach(inv => {
      const date = inv.paidAt || inv.dueDate;
      const month = months.find(m => m.key === date.slice(0, 7));

      if (month) month.income += Number(inv.amount);
    });

  bills
    .filter(bill => bill.status === 'paid')
    .forEach(bill => {
      const date = bill.paidAt || bill.dueDate;
      const month = months.find(m => m.key === date.slice(0, 7));

      if (month) month.expenses += Number(bill.amount);
    });

  const maxValue = Math.max(
    1,
    ...months.flatMap(m => [m.income, m.expenses])
  );

  const rows = months.map(m => {
    const incomeHeight = Math.max(2, m.income / maxValue * 100);
    const expenseHeight = Math.max(2, m.expenses / maxValue * 100);

    return `
      <div class="cashflow-month">
        <div class="cashflow-bars">
          <div class="cashflow-bar income-bar"
            style="height:${incomeHeight}%"
            title="Income: ${formatMoney(m.income)}"></div>

          <div class="cashflow-bar expense-bar"
            style="height:${expenseHeight}%"
            title="Expenses: ${formatMoney(m.expenses)}"></div>
        </div>

        <small>${m.label}</small>
      </div>
    `;
  }).join('');

  return `
    <section class="dashboard-panel cashflow-panel">
      <h3>Income vs Expenses</h3>

      <div class="cashflow-legend">
        <span><i class="legend-income"></i> Income</span>
        <span><i class="legend-expense"></i> Expenses</span>
      </div>

      <div class="cashflow-chart">
        ${rows}
      </div>

      <p class="cashflow-note">
        Monthly totals based on paid invoices and paid bills.
      </p>
    </section>
  `;
}

function showDashboard() {
  setActiveTab('dashboard');

  const main = document.getElementById('main');

  const todayStr = todayDateStr();

  // Calculate financial summaries
  const paidInvoices = invoices.filter(
    inv => inv.status === 'paid'
  );

  const unpaidInvoices = invoices.filter(
    inv => inv.status === 'unpaid'
  );

  const paidBills = bills.filter(
    bill => bill.status === 'paid'
  );

  const unpaidBills = bills.filter(
    bill => bill.status === 'unpaid'
  );

  const totalCollected = paidInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount), 0
  );

  const totalOutstanding = unpaidInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount), 0
  );

  const totalExpenses = paidBills.reduce(
    (sum, bill) => sum + Number(bill.amount), 0
  );

  const totalUnpaidBills = unpaidBills.reduce(
    (sum, bill) => sum + Number(bill.amount), 0
  );

  // Recent paid records
  const recentTransactions = [
    ...paidInvoices.map(inv => {
      const family = families.find(
        f => f.id === inv.familyId
      );

      return {
        name: family ? family.familyName : 'Deleted family',
        type: 'Fee collected',
        amount: Number(inv.amount),
        date: inv.dueDate,
        kind: 'income'
      };
    }),

    ...paidBills.map(bill => ({
      name: bill.payee,
      type: 'Bill paid',
      amount: Number(bill.amount),
      date: bill.dueDate,
      kind: 'expense'
    }))
  ].sort((a, b) => b.date.localeCompare(a.date))
   .slice(0, 5);

  // Upcoming unpaid invoices and bills
  const upcomingPayments = [
    ...unpaidInvoices.map(inv => {
      const family = families.find(
        f => f.id === inv.familyId
      );

      return {
        name: family ? family.familyName : 'Deleted family',
        amount: Number(inv.amount),
        date: inv.dueDate,
        type: 'Expected fee',
        direction: 'in'
      };
    }),

    ...unpaidBills.map(bill => ({
      name: bill.payee,
      amount: Number(bill.amount),
      date: bill.dueDate,
      type: 'Bill payment',
      direction: 'out'
    }))
  ].sort((a, b) => a.date.localeCompare(b.date))
   .slice(0, 6);

  // Families who owe money
  const owing = families.map(f => ({
    name: f.familyName,
    owed: unpaidInvoices
      .filter(inv => inv.familyId === f.id)
      .reduce((sum, inv) => sum + Number(inv.amount), 0)
  })).filter(f => f.owed > 0);

  const recentHTML = recentTransactions.length
    ? recentTransactions.map(item => `
        <div class="dashboard-list-item">
          <div>
            <strong>${item.name}</strong>
            <small>${item.type} · ${formatDisplayDate(item.date)}</small>
          </div>
          <strong class="${item.kind === 'income' ? 'income-text' : 'expense-text'}">
            ${item.kind === 'income' ? '+' : '-'}${formatMoney(item.amount)}
          </strong>
        </div>
      `).join('')
    : '<p class="empty-state">No completed transactions yet.</p>';

  const upcomingHTML = upcomingPayments.length
    ? upcomingPayments.map(item => {
        const overdue = item.date < todayStr;

        return `
          <div class="dashboard-list-item">
            <div>
              <strong>${item.name}</strong>
              <small>${item.type} · ${formatDisplayDate(item.date)}</small>
            </div>
            <div class="dashboard-payment-right">
              <strong>${formatMoney(item.amount)}</strong>
              <small class="${overdue ? 'expense-text' : ''}">
                ${overdue ? 'Overdue' : 'Pending'}
              </small>
            </div>
          </div>
        `;
      }).join('')
    : '<p class="empty-state">No pending payments.</p>';

  const owingHTML = owing.length
    ? owing.map(item => `
        <div class="dashboard-list-item">
          <strong>${item.name}</strong>
          <strong class="expense-text">${formatMoney(item.owed)}</strong>
        </div>
      `).join('')
    : '<p class="empty-state">Nobody owes you right now.</p>';

  main.innerHTML = `
    <section class="dashboard-header">
      <div>
        <h2>Dashboard</h2>
        <button type="button" onclick="exportCashPilotData()">
    Download Data Backup
</button>
        <button onclick="document.getElementById('backupFile').click()">
    Restore Backup
</button>

<input
    type="file"
    id="backupFile"
    accept=".json,application/json"
    style="display:none"
    onchange="restoreCashPilotData(event)"
>
        <p>Your business financial overview</p>
      </div>
      <span class="dashboard-date">${formatDisplayDate(todayStr)}</span>
    </section>

    <section class="dashboard-cards">

      <div class="dashboard-card">
        <span>Cash balance</span>
        <h2>${formatMoney(cashInHand)}</h2>
        <small>Available cash</small>
      </div>

      <div class="dashboard-card">
        <span>Fees collected</span>
        <h2>${formatMoney(totalCollected)}</h2>
        <small>All paid invoices</small>
      </div>

      <div class="dashboard-card">
        <span>Outstanding</span>
        <h2>${formatMoney(totalOutstanding)}</h2>
        <small>Unpaid invoices</small>
      </div>

      <div class="dashboard-card">
        <span>Paid expenses</span>
        <h2>${formatMoney(totalExpenses)}</h2>
        <small>All paid bills</small>
      </div>

    </section>

    <section class="dashboard-secondary">
      <div class="dashboard-panel">
        <h3>Recent transactions</h3>
        ${recentHTML}
      </div>

      <div class="dashboard-panel">
        <h3>Upcoming payments</h3>
        ${upcomingHTML}
      </div>
    </section>
    ${cashFlowChartHtml()}
    ${monthlyReportHtml()}

    <section class="dashboard-panel">
      <h3>Who owes you</h3>
      ${owingHTML}
    </section>

    <section class="dashboard-panel">
      ${alertsHtml()}
    </section>

    <section class="dashboard-panel">
      <h3>Unpaid bills</h3>
      <p>Total pending expenses:
        <strong>${formatMoney(totalUnpaidBills)}</strong>
      </p>
    </section>
  `;
}

// ============================================================
// BILLS AND CASH IN HAND
// ============================================================
let bills = JSON.parse(localStorage.getItem('bills')) || [];

let cashInHand = Number(
  localStorage.getItem('cashInHand')
) || 0;

function saveBills() {
  localStorage.setItem('bills', JSON.stringify(bills));
}

function saveCashInHand(value) {
  cashInHand = Number(value) || 0;
  localStorage.setItem('cashInHand', cashInHand);
}

function addBill(payee, amount, dueDate) {
  bills.push({
    id: Date.now(),
    payee: payee,
    amount: Number(amount),
    dueDate: dueDate,
    status: 'unpaid'
  });

  saveBills();
}

function markBillPaid(id) {
  const b = bills.find(x => x.id === id);

  if (!b || b.status === 'paid') return;

  b.status = 'paid';
  b.paidAt = todayDateStr();

  saveBills();
  adjustCash(-b.amount);
}
function showBills() {
    setActiveTab('forecast');

    main.innerHTML = `
        <section class="page-header">
            <h2>Cash & Expenses</h2>
            <p>Manage your cash balance and business expenses.</p>
        </section>

        <section class="card">
            <h3>Cash in Hand</h3>
            <form id="cashForm">
                <input type="number" id="cashAmount"
                    placeholder="Enter current cash balance" min="0" required>
                <button type="submit">Update Cash</button>
            </form>
        </section>

        ${forecastHtml()}

        <section class="card">
            <h3>Add New Bill</h3>
            <form id="billForm">
                <label>Bill Name</label>
                <input type="text" id="billName"
                    placeholder="e.g. Electricity" required>

                <label>Amount</label>
                <input type="number" id="billAmount"
                    min="1" placeholder="Enter amount" required>

                <label>Due Date</label>
                <input type="date" id="billDueDate" required>

                <button type="submit">Add Bill</button>
            </form>
        </section>

        <section class="card">
            <h3>Bill Management</h3>
            <div class="invoice-filters">
                <button type="button" data-bill-filter="all">All</button>
                <button type="button" data-bill-filter="paid">Paid</button>
                <button type="button" data-bill-filter="unpaid">Unpaid</button>
                <button type="button" data-bill-filter="overdue">Overdue</button>
            </div>
            <div id="billList"></div>
        </section>
    `;

    let currentFilter = 'all';

    function renderBills() {
        const today = todayDateStr();

        const filteredBills = bills.filter(bill => {
            if (currentFilter === 'paid')
                return bill.status === 'paid';

            if (currentFilter === 'unpaid')
                return bill.status !== 'paid';

            if (currentFilter === 'overdue')
                return bill.status !== 'paid' && bill.dueDate < today;

            return true;
        });

        const billHTML = filteredBills.map(bill => `
            <div class="invoice-row">
                <p><strong>${bill.name}</strong></p>
                <p>Amount: ${formatMoney(bill.amount)}</p>
                <p>Due: ${formatDisplayDate(bill.dueDate)}</p>
                <p>Status: ${bill.status}</p>

                ${bill.status !== 'paid' ? `
                    <button data-bill-pay="${bill.id}">
                        Mark Paid
                    </button>
                ` : ''}

                <button data-bill-delete="${bill.id}">
                    Delete
                </button>
            </div>
        `).join('');

        document.getElementById('billList').innerHTML =
            filteredBills.length
                ? billHTML
                : '<p>No bills found.</p>';
    }

    document.querySelectorAll('[data-bill-filter]').forEach(button => {
        button.addEventListener('click', () => {
            currentFilter = button.dataset.billFilter;
            renderBills();
        });
    });

    document.getElementById('cashForm').addEventListener('submit', e => {
        e.preventDefault();

        const amount = Number(document.getElementById('cashAmount').value);

        if (amount < 0) return;

        cashInHand = amount;
        saveData();
        showBills();
    });

    document.getElementById('billForm').addEventListener('submit', e => {
        e.preventDefault();

        const name = document.getElementById('billName').value.trim();
        const amount = Number(document.getElementById('billAmount').value);
        const dueDate = document.getElementById('billDueDate').value;

        if (!name || amount <= 0 || !dueDate) return;

        bills.push({
            id: Date.now(),
            name,
            amount,
            dueDate,
            status: 'unpaid'
        });

        saveData();
        showBills();
    });

    document.getElementById('billList').addEventListener('click', e => {
        const payId = e.target.dataset.billPay;
        const deleteId = e.target.dataset.billDelete;

        if (payId) {
            markBillPaid(Number(payId));
            showBills();
        }

        if (deleteId) {
            if (confirm('Are you sure you want to delete this bill?')) {
                bills = bills.filter(bill => bill.id != deleteId);
                saveData();
                showBills();
            }
        }
    });

    renderBills();
}

// ============================================================
// FORECAST AND WHAT-IF SCENARIO
// ============================================================
let whatIf = { familyId: 0, days: 0 };

function effectiveDate(dueDate, todayStr) {
  return dueDate < todayStr ? todayStr : dueDate;
}

function buildForecast(days, scenario) {
  const today = new Date();
  const dates = [];

  for (let i = 0; i <= days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(dateToStr(d));
  }

  const todayStr = dates[0];

  const late = scenario &&
    scenario.familyId &&
    scenario.days > 0
    ? scenario
    : null;

  let balance = cashInHand;

  let lowest = {
    amount: balance,
    date: todayStr
  };

  const daily = dates.map(date => {

    // Unpaid invoices
    const invoiceIn = invoices
      .filter(inv => {
        if (inv.status !== 'unpaid') return false;

        const shift = late &&
          inv.familyId === late.familyId
          ? late.days : 0;

        const due = addDaysStr(inv.dueDate, shift);

        return effectiveDate(due, todayStr) === date;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Expected monthly fees
    const expectedIn = expectedFees
      .filter(fee => {
        const shift = late &&
          fee.familyId === late.familyId
          ? late.days : 0;

        const original = addDaysStr(date, -shift);

        return original >= todayStr &&
          Number(original.slice(8, 10)) === fee.dayOfMonth &&
          families.some(f => f.id === fee.familyId) &&
          !invoices.some(inv =>
            inv.familyId === fee.familyId &&
            inv.dueDate.slice(0, 7) === original.slice(0, 7)
          );
      })
      .reduce((sum, fee) => sum + fee.amount, 0);

    const inflow = invoiceIn + expectedIn;

    // Unpaid bills
    const outflow = bills
      .filter(b =>
        b.status === 'unpaid' &&
        effectiveDate(b.dueDate, todayStr) === date
      )
      .reduce((sum, b) => sum + b.amount, 0);

    balance = balance + inflow - outflow;

    if (balance < lowest.amount) {
      lowest = {
        amount: balance,
        date: date
      };
    }

    return {
      date: date,
      inflow: inflow,
      outflow: outflow,
      balance: balance
    };
  });

  return {
    daily: daily,
    lowest: lowest,
    endBalance: balance
  };
}

function forecastHtml() {
  const base = buildForecast(90, null);

  const hasScenario =
    whatIf.familyId > 0 && whatIf.days > 0;

  const scen = hasScenario
    ? buildForecast(90, whatIf)
    : base;

  const fam = families.find(
    f => f.id === whatIf.familyId
  );

  const totalIn = base.daily.reduce(
    (sum, d) => sum + d.inflow, 0
  );

  const totalOut = base.daily.reduce(
    (sum, d) => sum + d.outflow, 0
  );

  const options =
    `<option value="0">No scenario</option>` +
    families.map(f =>
      `<option value="${f.id}" ${
        f.id === whatIf.familyId ? 'selected' : ''
      }>${f.familyName}</option>`
    ).join('');

  const compare = hasScenario
    ? `
      <p>
        If ${fam ? fam.familyName : 'this family'}
        pays ${whatIf.days} days late:
      </p>

      <ul>
        <li>
          Cash in 90 days:
          ₹${base.endBalance} → ₹${scen.endBalance}
        </li>

        <li>
          Lowest cash:
          ₹${base.lowest.amount} → ₹${scen.lowest.amount}
          on ${scen.lowest.date}
        </li>
      </ul>
    `
    : '';

  const warning = scen.lowest.amount < 0
    ? `
      <p class="overdue">
        <strong>
          Warning: cash goes negative on ${scen.lowest.date}.
        </strong>
      </p>
    `
    : '';

  return `
    <h3>90-day forecast</h3>

    <p>Expected money in:
      <strong>₹${totalIn}</strong>
    </p>

    <p>Expected bills out:
      <strong>₹${totalOut}</strong>
    </p>

    <p>Cash in 90 days:
      <strong>₹${base.endBalance}</strong>
    </p>

    <p>Lowest cash:
      <strong>₹${base.lowest.amount}</strong>
      on ${base.lowest.date}
    </p>

    <h3>What if a family pays late?</h3>

    <form id="whatIfForm">
      <select id="whatIfFamily">
        ${options}
      </select>

      <input type="number"
        id="whatIfDays"
        min="0"
        max="120"
        placeholder="Days late"
        value="${whatIf.days}">

      <button type="submit">Run</button>
    </form>

    ${compare}
    ${warning}
    ${feesHtml()}
  `;
}

document.addEventListener('submit', e => {
  if (e.target.id !== 'whatIfForm') return;

  e.preventDefault();

  whatIf = {
    familyId: Number(
      document.getElementById('whatIfFamily').value
    ),
    days: Number(
      document.getElementById('whatIfDays').value
    ) || 0
  };

  showBills();
});

// ============================================================
// EXPECTED MONTHLY FEES
// ============================================================
let expectedFees =
  JSON.parse(localStorage.getItem('expectedFees')) || [];

function saveExpectedFees() {
  localStorage.setItem(
    'expectedFees',
    JSON.stringify(expectedFees)
  );
}

function feesHtml() {
  const options = families.map(f =>
    `<option value="${f.id}">
      ${f.familyName} (${f.studentName})
    </option>`
  ).join('');

  const rows = expectedFees.map(f => {
    const family = families.find(
      x => x.id === f.familyId
    );

    const name = family
      ? family.familyName
      : 'Deleted family';

    return `
      <li>
        ${name}: ₹${f.amount} on day ${f.dayOfMonth}
        of each month
        <button data-delete-fee="${f.id}">Delete</button>
      </li>
    `;
  }).join('');

  return `
    <h3>Expected monthly fees</h3>

    <form id="feeForm">
      <select id="feeFamily" required>
        ${options}
      </select>

      <input type="number"
        id="feeAmount"
        min="1"
        placeholder="Monthly fee (₹)"
        required>

      <input type="number"
        id="feeDay"
        min="1"
        max="31"
        placeholder="Day of month"
        required>

      <button type="submit"
        ${families.length === 0 ? 'disabled' : ''}>
        Add fee
      </button>
    </form>

    <ul>${rows || '<li>No expected fees yet.</li>'}</ul>
  `;
}

document.addEventListener('submit', e => {
  if (e.target.id !== 'feeForm') return;

  e.preventDefault();

  const familyId = Number(
    document.getElementById('feeFamily').value
  );

  if (!families.some(f => f.id === familyId)) {
    alert('Choose a family first. If the list is empty, add the family on the Customers screen.');
    return;
  }

  const dayOfMonth = Number(
    document.getElementById('feeDay').value
  );

  if (dayOfMonth < 1 || dayOfMonth > 31) {
    alert('Day of month must be between 1 and 31.');
    return;
  }

  expectedFees.push({
    id: Date.now(),
    familyId: familyId,
    amount: Number(
      document.getElementById('feeAmount').value
    ),
    dayOfMonth: dayOfMonth
  });

  saveExpectedFees();
  showBills();
});

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-delete-fee]');
  if (!btn) return;

  expectedFees = expectedFees.filter(
    f => f.id !== Number(btn.dataset.deleteFee)
  );

  saveExpectedFees();
  showBills();
});

// ============================================================
// WHATSAPP REMINDERS
// ============================================================
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-remind]');
  if (!btn) return;

  const inv = invoices.find(
    i => i.id === Number(btn.dataset.remind)
  );

  if (!inv) return;

  const family = families.find(
    f => f.id === inv.familyId
  );

  const name = family ? family.familyName : 'there';
  const message =
    `Hello ${name}, a friendly reminder that the fee of ₹${inv.amount} ` +
    `was due on ${inv.dueDate}. Please share the payment when you can. Thank you.`;

  const win = window.open(
    'https://wa.me/?text=' + encodeURIComponent(message),
    '_blank'
  );

  if (!win) {
    alert(
      'The browser blocked WhatsApp. Allow pop-ups for this page, or copy this message:\n\n' +
      message
    );
  }
});

// ============================================================
// NAVIGATION
// ============================================================
function setActiveTab(tabName) {
  document.querySelectorAll('nav button').forEach(btn => {
    btn.classList.toggle(
      'active',
      btn.dataset.tab === tabName
    );
  });
}

document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    if (tab === 'dashboard') showDashboard();
    if (tab === 'customers') showCustomers();
    if (tab === 'invoices') showInvoices();
    if (tab === 'forecast') showBills();
  });
});
function exportCashPilotData() {
    try {
        const backup = {
            exportDate: new Date().toISOString(),
            cashInHand: cashInHand,
            families: families,
            invoices: invoices,
            bills: bills,
            expectedFees: expectedFees
        };

        const jsonData = JSON.stringify(backup, null, 2);

        const blob = new Blob([jsonData], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'CashPilot_Backup.json';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        alert('CashPilot backup downloaded successfully!');

    } catch (error) {
        console.error('Backup error:', error);
        alert('Backup download failed. Check the browser console.');
    }
}
function restoreCashPilotData(event) {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (
                !Array.isArray(data.families) ||
                !Array.isArray(data.invoices) ||
                !Array.isArray(data.bills) ||
                !Array.isArray(data.expectedFees) ||
                typeof data.cashInHand !== 'number' ||
                !Number.isFinite(data.cashInHand)
            ) {
                throw new Error('Invalid backup file');
            }

            if (!confirm('This will replace your current CashPilot data. Continue?')) {
                event.target.value = '';
                return;
            }

            families = data.families;
            invoices = data.invoices;
            bills = data.bills;
            expectedFees = data.expectedFees;
            cashInHand = data.cashInHand;

            saveData();

            alert('Backup restored successfully!');
            showDashboard();

        } catch (error) {
            alert('Invalid backup file. Please select a valid CashPilot backup.');
        }

        event.target.value = '';
    };

    reader.readAsText(file);
}
function monthlyReportHtml() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const income = invoices
        .filter(inv => {
            const date = new Date(inv.paidAt || inv.dueDate);
            return inv.status === 'paid' &&
                date.getMonth() === month &&
                date.getFullYear() === year;
        })
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

    const expenses = bills
        .filter(bill => {
            const date = new Date(bill.paidAt || bill.dueDate);
            return bill.status === 'paid' &&
                date.getMonth() === month &&
                date.getFullYear() === year;
        })
        .reduce((sum, bill) => sum + Number(bill.amount), 0);

    const outstanding = invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

    const unpaidBills = bills
        .filter(bill => bill.status !== 'paid')
        .reduce((sum, bill) => sum + Number(bill.amount), 0);

    return `
        <section class="card">
            <h3>Monthly Financial Report</h3>
            <p>Income collected: ${formatMoney(income)}</p>
            <p>Expenses paid: ${formatMoney(expenses)}</p>
            <h3>Net Profit: ${formatMoney(income - expenses)}</h3>
            <p>Outstanding invoices: ${formatMoney(outstanding)}</p>
            <p>Unpaid bills: ${formatMoney(unpaidBills)}</p>
        </section>
    `;
}

// ============================================================
// INITIAL STARTUP
// ============================================================
showDashboard()