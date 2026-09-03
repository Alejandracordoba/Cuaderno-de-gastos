var App = {
  async init() {
    this.data = await this.loadData();
    if (!this.data) this.data = { transactions: [], installments: [], fixedExpenses: [], savings: [] };
    if (!this.data.fixedExpenses) this.data.fixedExpenses = [];
    if (!this.data.savings) this.data.savings = [];
    this.setupTabs();
    this.setupForm();
    this.setupSavings();
    this.setupFilters();
    this.setDefaultDate();
    this.render();
  },

  // ── Storage ──────────────────────────────────────────
  async loadData() {
    return await window.__storage.get('cuadernoData');
  },

  async save() {
    await window.__storage.set('cuadernoData', this.data);
  },

  // ── Tabs ─────────────────────────────────────────────
  setupTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });
  },

  // ── Form ─────────────────────────────────────────────
  setupForm() {
    const form = document.getElementById('form-add');
    const isInstallment = document.querySelectorAll('input[name="isInstallment"]');
    const paymentMethod = document.querySelectorAll('input[name="paymentMethod"]');

    isInstallment.forEach(r => {
      r.addEventListener('change', () => {
        document.getElementById('installment-fields').style.display =
          r.value === 'yes' ? 'flex' : 'none';
        if (r.value === 'yes') {
          document.querySelectorAll('input[name="isSubscription"]').forEach(x => x.checked = false);
          document.getElementById('subscription-hint').textContent = '';
        }
        this.updateInstallmentHint();
      });
    });

    paymentMethod.forEach(r => {
      r.addEventListener('change', () => this.updateInstallmentHint());
    });

    const isSubscription = document.querySelectorAll('input[name="isSubscription"]');
    const subscriptionFields = document.getElementById('subscription-fields');
    isSubscription.forEach(r => {
      r.addEventListener('change', () => {
        const hint = document.getElementById('subscription-hint');
        if (r.value === 'yes') {
          subscriptionFields.style.display = 'flex';
          hint.textContent = '💰 Se descuenta automáticamente cada mes';
          hint.style.color = '#6c5ce7';
          document.querySelectorAll('input[name="isInstallment"]').forEach(x => x.checked = false);
          document.getElementById('installment-fields').style.display = 'none';
        } else {
          subscriptionFields.style.display = 'none';
          hint.textContent = '';
        }
      });
    });

    const dateInput = document.getElementById('input-date');
    dateInput.addEventListener('change', () => this.updateInstallmentHint());

    this.updateInstallmentHint();
    this.setDefaultDate();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addTransaction();
    });
  },

  setupSavings() {
    const btn = document.getElementById('btn-add-save');
    if (btn) {
      btn.addEventListener('click', () => this.addSavings());
    }
    const saveMonth = document.getElementById('input-save-month');
    if (saveMonth) {
      const now = new Date();
      let nextMon = now.getMonth() + 2;
      let nextYear = now.getFullYear();
      if (nextMon > 12) { nextMon = 1; nextYear++; }
      saveMonth.value = `${nextYear}-${String(nextMon).padStart(2, '0')}`;
    }
    this.renderNextMonth();
  },

  async addSavings() {
    const desc = document.getElementById('input-save-desc').value.trim();
    const amount = parseFloat(document.getElementById('input-save-amount').value);
    const month = document.getElementById('input-save-month').value;
    if (!desc || !amount || !month) {
      this.toast('Completa todos los campos');
      return;
    }
    this.data.savings.push({
      id: Date.now(),
      desc,
      amount,
      month,
      createdAt: new Date().toISOString()
    });
    await this.save();
    this.render();
    this.resetSaveForm();
    this.toast('Ahorro agregado');
  },

  resetSaveForm() {
    document.getElementById('input-save-desc').value = '';
    document.getElementById('input-save-amount').value = '';
  },

  deleteSavings(id) {
    return this._deleteSavings(id);
  },
  async _deleteSavings(id) {
    if (!confirm('¿Eliminar este ahorro?')) return;
    this.data.savings = this.data.savings.filter(s => s.id !== id);
    await this.save();
    this.render();
    this.toast('Ahorro eliminado');
  },

  renderNextMonth() {
    const container = document.getElementById('nextmonth-list');
    const totalEl = document.getElementById('nextmonth-total');

    if (!container) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let nextYear = now.getFullYear();
    let nextMon = now.getMonth() + 2;
    if (nextMon > 12) { nextMon = 1; nextYear++; }
    const nextMonthStr = `${nextYear}-${String(nextMon).padStart(2, '0')}`;

    const futureSavings = this.data.savings.filter(s => s.month >= nextMonthStr);
    const totalSavings = futureSavings.reduce((sum, s) => sum + s.amount, 0);

    const upcomingInstallments = this.data.installments.filter(inst => {
      const startParts = inst.startMonth.split('-');
      const startYear = parseInt(startParts[0]);
      const startMon = parseInt(startParts[1]);
      if (startYear !== nextYear || startMon !== nextMon) return false;
      const monthsDiff = (nextYear - startYear) * 12 + (nextMon - startMon);
      return monthsDiff >= 0 && monthsDiff < inst.totalInstallments;
    });
    const totalInstallments = upcomingInstallments.reduce((sum, inst) => sum + inst.installmentAmount, 0);

    const totalNeeded = totalSavings + totalInstallments;

    let html = '';

    if (upcomingInstallments.length > 0) {
      html += `<h3 style="margin-top:16px;color:#6c5ce7;">💳 Cuotas próximo mes</h3>`;
      html += upcomingInstallments.map(inst => {
        const methodBadge = inst.paymentMethod === 'credit' ? '💳 Crédito' : '💰 Débito';
        return `
          <div class="installment-item">
            <h4>${inst.desc} <span style="font-size:0.75rem;color:#888;">${methodBadge}</span></h4>
            <div class="details">
              <span>${inst.startMonth} · ${inst.paid}/${inst.totalInstallments} cuotas pagadas</span>
              <span style="color:#e17055;font-weight:700;">${this.formatMoney(inst.installmentAmount)}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    if (futureSavings.length > 0) {
      html += `<h3 style="margin-top:16px;color:#00b894;">💰 Ahorros próximo mes</h3>`;
      html += futureSavings.map(s => `
        <div class="installment-item">
          <h4>${s.desc}</h4>
          <div class="details">
            <span>${s.month}</span>
            <span style="color:#00b894;font-weight:700;">${this.formatMoney(s.amount)}</span>
          </div>
          <button onclick="App.deleteSavings(${s.id})" style="margin-top:8px;background:none;border:1px solid #00b894;color:#00b894;padding:6px 12px;border-radius:6px;font-size:0.8rem;cursor:pointer;">Eliminar</button>
        </div>
      `).join('');
    }

    if (html === '') {
      container.innerHTML = `<div class="empty-state"><span>📒</span>No hay datos para próximo mes</div>`;
      if (totalEl) totalEl.innerHTML = '';
      return;
    }

    container.innerHTML = html;

    if (totalEl) {
      totalEl.innerHTML = `
        <div class="monthly-box" style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#e17055;font-weight:600;">Total necesario próximo mes:</span>
            <span style="color:#e17055;font-weight:700;font-size:1.1rem;">${this.formatMoney(totalNeeded)}</span>
          </div>
          ${totalSavings > 0 ? `<div style="text-align:right;font-size:0.8rem;color:#00b894;margin-top:4px;">Ahorros: ${this.formatMoney(totalSavings)}</div>` : ''}
          ${totalInstallments > 0 ? `<div style="text-align:right;font-size:0.8rem;color:#e17055;margin-top:2px;">Cuotas: ${this.formatMoney(totalInstallments)}</div>` : ''}
        </div>
      `;
    }
  },

  updateInstallmentHint() {
    const isInstallment = document.querySelector('input[name="isInstallment"]:checked')?.value === 'yes';
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const dateInput = document.getElementById('input-date').value;
    const hint = document.getElementById('installment-hint');
    const startInput = document.getElementById('input-start-month');

    if (!isInstallment || !hint) return;

    if (paymentMethod === 'credit' && dateInput) {
      const [year, month] = dateInput.split('-').map(Number);
      let nextMon = month + 1;
      let nextYear = year;
      if (nextMon > 12) { nextMon = 1; nextYear++; }
      const suggested = `${nextYear}-${String(nextMon).padStart(2, '0')}`;
      startInput.value = suggested;
      hint.textContent = `💳 Crédito → primer pago: ${suggested}`;
      hint.style.color = '#6c5ce7';
    } else if (paymentMethod === 'debit') {
      startInput.value = dateInput || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      hint.textContent = `💰 Débito → se descuenta todo en el mes de compra`;
      hint.style.color = '#e17055';
    } else {
      hint.textContent = '';
    }
  },

  setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('input-date').value = today;
  },

  async addTransaction() {
    const desc = document.getElementById('input-desc').value.trim();
    const amount = parseFloat(document.getElementById('input-amount').value);
    const isSubscription = document.querySelector('input[name="isSubscription"]:checked')?.value;
    const type = document.querySelector('input[name="type"]:checked')?.value;
    const category = document.getElementById('input-category').value;
    const isInstallment = document.querySelector('input[name="isInstallment"]:checked')?.value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'debit';
    const date = document.getElementById('input-date').value;

    if (!desc || !amount || !date) {
      this.toast('Completa todos los campos');
      return;
    }

    if (isSubscription === 'yes') {
      const currency = document.getElementById('input-subscription-currency').value;
      const exchangeRate = parseFloat(document.getElementById('input-exchange-rate').value) || 0;
      const fixedExpense = {
        id: Date.now(),
        desc,
        amount,
        currency,
        exchangeRate,
        category,
        createdAt: new Date().toISOString()
      };
      this.data.fixedExpenses.push(fixedExpense);
      await this.save();
      this.render();
      this.resetForm();
      this.toast('Suscripción agregada');
      return;
    }

    if (!type || !category) {
      this.toast('Completa todos los campos');
      return;
    }

    const transaction = {
      id: Date.now(),
      desc,
      amount,
      type,
      category,
      date,
      paymentMethod,
      createdAt: new Date().toISOString()
    };

    this.data.transactions.push(transaction);

    if (isInstallment === 'yes') {
      const installments = parseInt(document.getElementById('input-installments').value) || 1;
      const installmentAmount = parseFloat(document.getElementById('input-installment-amount').value) || amount;
      const startMonth = document.getElementById('input-start-month').value;

      if (!startMonth) {
        this.toast('Selecciona mes de primer pago');
        return;
      }

      this.data.installments.push({
        id: Date.now() + 1,
        transactionId: transaction.id,
        desc,
        totalAmount: amount,
        installmentAmount,
        totalInstallments: installments,
        paidInstallments: 0,
        startMonth,
        paymentMethod,
        createdAt: new Date().toISOString()
      });
    }

    await this.save();
    this.render();
    this.resetForm();
    this.toast('Movimiento agregado');
  },

  resetForm() {
    document.getElementById('form-add').reset();
    this.setDefaultDate();
    document.getElementById('installment-fields').style.display = 'none';
    document.getElementById('subscription-fields').style.display = 'none';
    document.getElementById('subscription-hint').textContent = '';
    this.updateInstallmentHint();
  },

  // ── Filters ──────────────────────────────────────────
  setupFilters() {
    document.getElementById('filter-type').addEventListener('change', () => this.renderHistory());
    document.getElementById('filter-category').addEventListener('change', () => this.renderHistory());
  },

  // ── Render All ───────────────────────────────────────
  render() {
    this.renderDashboard();
    this.renderSubscriptions();
    this.renderNextMonth();
    this.renderHistory();
    this.renderInstallments();
  },

  // ── Dashboard ────────────────────────────────────────
  renderDashboard() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalIncome = 0;
    let totalExpense = 0;
    let monthIncome = 0;
    let monthExpense = 0;

    // Debit transactions: full amount deducted immediately in purchase month
    this.data.transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
        if (t.date && t.date.startsWith(currentMonth)) monthIncome += t.amount;
      } else if (t.paymentMethod === 'debit') {
        totalExpense += t.amount;
        if (t.date && t.date.startsWith(currentMonth)) monthExpense += t.amount;
      }
      // credit transactions: full amount NOT deducted (handled by installments)
    });

    // Credit installments: each installment counts when it comes due
    this.data.installments.forEach(inst => {
      if (inst.paymentMethod !== 'credit') return;
      const startParts = inst.startMonth.split('-');
      const startYear = parseInt(startParts[0]);
      const startMon = parseInt(startParts[1]);

      let currentYear = now.getFullYear();
      let currentMon = now.getMonth() + 1;

      let monthsDiff = (currentYear - startYear) * 12 + (currentMon - startMon);
      // All installments that have been paid (past + current month)
      const paidMonths = Math.min(Math.max(monthsDiff + 1, 0), inst.totalInstallments);
      totalExpense += inst.installmentAmount * paidMonths;
      // Only current month counts toward monthly expense
      if (monthsDiff >= 0 && monthsDiff < inst.totalInstallments) {
        monthExpense += inst.installmentAmount;
      }
    });

    // Credit without installments: full amount deducted the next month
    this.data.transactions.forEach(t => {
      if (t.type === 'expense' && t.paymentMethod === 'credit' && !this.data.installments.find(i => i.transactionId === t.id)) {
        const purchaseDate = new Date(t.date);
        let nextMon = purchaseDate.getMonth() + 2;
        let nextYear = purchaseDate.getFullYear();
        if (nextMon > 12) { nextMon = 1; nextYear++; }
        const nextMonthStr = `${nextYear}-${String(nextMon).padStart(2, '0')}`;
        if (nextMonthStr === currentMonth) {
          monthExpense += t.amount;
        }
        totalExpense += t.amount;
      }
     });

    // Fixed expenses (subscriptions): automatic monthly debit, convert USD to ARS
    this.data.fixedExpenses.forEach(fe => {
      const rate = fe.exchangeRate || 0;
      const arsAmount = fe.currency === 'usd' ? fe.amount * rate : fe.amount;
      totalExpense += arsAmount;
      monthExpense += arsAmount;
    });

    const balance = totalIncome - totalExpense;
    const monthBalance = monthIncome - monthExpense;

    document.getElementById('total-income').textContent = this.formatMoney(totalIncome);
    document.getElementById('total-expense').textContent = this.formatMoney(totalExpense);

    const balanceEl = document.getElementById('total-balance');
    balanceEl.textContent = this.formatMoney(balance);
    balanceEl.className = balance >= 0 ? 'positive' : 'negative';

    // Monthly summary
    const monthlyEl = document.getElementById('monthly-summary');
    if (monthIncome === 0 && monthExpense === 0) {
      monthlyEl.innerHTML = `<p>No hay datos este mes (${currentMonth})</p>`;
    } else {
      monthlyEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#00b894">Ingresos: ${this.formatMoney(monthIncome)}</span>
          <span style="color:#e17055">Egresos: ${this.formatMoney(monthExpense)}</span>
        </div>
        <div style="font-size:1.1rem;font-weight:700;color:${monthBalance >= 0 ? '#00b894' : '#e17055'}">
          Balance del mes: ${this.formatMoney(monthBalance)}
        </div>
      `;
    }

    // Upcoming installments
    this.renderUpcomingInstallments(currentMonth);
  },

  renderUpcomingInstallments(currentMonth) {
    const container = document.getElementById('upcoming-installments');
    const upcoming = [];

    this.data.installments.forEach(inst => {
      const startParts = inst.startMonth.split('-');
      const startYear = parseInt(startParts[0]);
      const startMon = parseInt(startParts[1]);

      const now = new Date();
      let currentYear = now.getFullYear();
      let currentMon = now.getMonth() + 1;

      let monthsDiff = (currentYear - startYear) * 12 + (currentMon - startMon);

       if (monthsDiff >= 0 && monthsDiff < inst.totalInstallments) {
          const remaining = inst.totalInstallments - monthsDiff;
          const method = inst.paymentMethod === 'credit' ? '💳' : '💰';
          upcoming.push({
            desc: inst.desc,
            amount: inst.installmentAmount,
            remaining,
            paid: monthsDiff + 1,
            total: inst.totalInstallments,
            method
          });
        }
      });

      if (upcoming.length === 0) {
      container.innerHTML = `<p>No hay cuotas pendientes este mes</p>`;
      return;
    }

     container.innerHTML = upcoming.map(u => `
       <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #2a2a4a;">
         <div>
           <div style="color:#fff;font-size:0.9rem;">${u.method} ${u.desc}</div>
           <div style="color:#888;font-size:0.75rem;">${u.paid}/${u.total} cuotas · ${this.formatMoney(u.amount)}/cuota</div>
         </div>
         <div style="color:#e17055;font-weight:600;">${this.formatMoney(u.amount)}</div>
       </div>
     `).join('');
  },

  // ── History ──────────────────────────────────────────
  renderHistory() {
    const container = document.getElementById('history-list');
    const typeFilter = document.getElementById('filter-type').value;
    const catFilter = document.getElementById('filter-category').value;

    let filtered = [...this.data.transactions];

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    if (catFilter !== 'all') {
      filtered = filtered.filter(t => t.category === catFilter);
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><span>📭</span>No hay movimientos</div>`;
      return;
    }

    const categoryEmojis = {
      general: '📋', alimentacion: '🍔', transporte: '🚗',
      entretenimiento: '🎮', servicios: '💡', salud: '🏥',
      educacion: '📚', trabajo: '💼', otro: '📦'
    };

    container.innerHTML = filtered.map(t => {
      const methodBadge = t.type === 'expense' ? (t.paymentMethod === 'credit' ? '💳' : '💰') : '';
      return `
        <div class="history-item">
          <div class="info">
            <h4>${categoryEmojis[t.category] || '📋'} ${t.desc}</h4>
            <span>${this.formatDate(t.date)} · ${t.category} · ${methodBadge} ${t.paymentMethod === 'credit' ? 'Crédito' : 'Débito'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="amount ${t.type}">
              ${t.type === 'income' ? '+' : '-'}${this.formatMoney(t.amount)}
            </span>
            <button class="delete-btn" onclick="App.deleteTransaction(${t.id})">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ── Installments ─────────────────────────────────────
  renderInstallments() {
    const container = document.getElementById('installments-list');
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMon = now.getMonth() + 1;

    if (this.data.installments.length === 0) {
      container.innerHTML = `<div class="empty-state"><span>💳</span>No hay cuotas registradas</div>`;
      return;
    }

    container.innerHTML = this.data.installments.map(inst => {
      const startParts = inst.startMonth.split('-');
      const startYear = parseInt(startParts[0]);
      const startMon = parseInt(startParts[1]);

      let monthsDiff = (currentYear - startYear) * 12 + (currentMon - startMon);
      monthsDiff = Math.max(0, monthsDiff);
      const paid = Math.min(monthsDiff, inst.totalInstallments);
      const remaining = inst.totalInstallments - paid;
      const progress = (paid / inst.totalInstallments) * 100;
      const status = remaining === 0 ? 'paid' : 'remaining';

      const methodBadge = inst.paymentMethod === 'credit' ? '💳 Crédito' : '💰 Débito';
      return `
        <div class="installment-item">
          <h4>${inst.desc} <span style="font-size:0.75rem;color:#888;">${methodBadge}</span></h4>
          <div class="details">
            <span>Cuota: ${this.formatMoney(inst.installmentAmount)}</span>
            <span>${paid}/${inst.totalInstallments} cuotas</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:0.85rem;">
            <span class="${status === 'paid' ? 'paid' : ''}">${status === 'paid' ? '✅ Completado' : `${remaining} cuotas restantes`}</span>
            <span>Total: ${this.formatMoney(inst.totalAmount)}</span>
          </div>
          <button onclick="App.deleteInstallment(${inst.id})" style="margin-top:8px;background:none;border:1px solid #e17055;color:#e17055;padding:6px 12px;border-radius:6px;font-size:0.8rem;cursor:pointer;">Eliminar</button>
        </div>
      `;
    }).join('');
  },

  // ── Delete ───────────────────────────────────────────
  deleteTransaction(id) {
    return this._deleteTransaction(id);
  },
  async _deleteTransaction(id) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    this.data.transactions = this.data.transactions.filter(t => t.id !== id);
    this.data.installments = this.data.installments.filter(i => i.transactionId !== id);
    await this.save();
    this.render();
    this.toast('Movimiento eliminado');
  },

  deleteInstallment(id) {
    return this._deleteInstallment(id);
  },
  async _deleteInstallment(id) {
    if (!confirm('¿Eliminar esta cuota y su movimiento asociado?')) return;
    const inst = this.data.installments.find(i => i.id === id);
    if (inst) {
      this.data.transactions = this.data.transactions.filter(t => t.id !== inst.transactionId);
    }
    this.data.installments = this.data.installments.filter(i => i.id !== id);
    await this.save();
    this.render();
    this.toast('Cuota eliminada');
  },

  // ── Subscriptions ────────────────────────────────
  deleteFixedExpense(id) {
    return this._deleteFixedExpense(id);
  },
  async _deleteFixedExpense(id) {
    if (!confirm('¿Eliminar esta suscripción?')) return;
    this.data.fixedExpenses = this.data.fixedExpenses.filter(f => f.id !== id);
    await this.save();
    this.render();
    this.toast('Suscripción eliminada');
  },

  renderSubscriptions() {
    const container = document.getElementById('subscriptions-list');
    const totalEl = document.getElementById('subscriptions-total');

    if (this.data.fixedExpenses.length === 0) {
      container.innerHTML = `<div class="empty-state"><span>💳</span>No hay suscripciones registradas</div>`;
      totalEl.innerHTML = '';
      return;
    }

    const totalARS = this.data.fixedExpenses.reduce((sum, f) => {
      const rate = f.exchangeRate || 0;
      return sum + (f.currency === 'usd' ? f.amount * rate : f.amount);
    }, 0);
    const totalUSD = this.data.fixedExpenses.filter(f => f.currency === 'usd').reduce((sum, f) => sum + f.amount, 0);

    container.innerHTML = this.data.fixedExpenses.map(f => {
      const rate = f.exchangeRate || 0;
      const arsAmount = f.currency === 'usd' ? f.amount * rate : f.amount;
      const currencyLabel = f.currency === 'usd' ? `USD` : `ARS`;
      const convNote = f.currency === 'usd'
        ? `${this.formatMoney(f.amount)} ${currencyLabel} = ${this.formatMoney(arsAmount)} ARS (×${rate})`
        : `${this.formatMoney(f.amount)} ARS`;
      return `
        <div class="installment-item">
          <h4>${f.desc} <span style="font-size:0.75rem;color:#6c5ce7;">💰 Mensual</span> <span style="font-size:0.75rem;color:#e17055;">${currencyLabel}</span></h4>
          <div class="details">
            <span>${f.category}</span>
            <span style="color:#e17055;font-weight:700;">${convNote}</span>
          </div>
          <button onclick="App.deleteFixedExpense(${f.id})" style="margin-top:8px;background:none;border:1px solid #e17055;color:#e17055;padding:6px 12px;border-radius:6px;font-size:0.8rem;cursor:pointer;">Eliminar</button>
        </div>
      `;
    }).join('');

    totalEl.innerHTML = `
      <div class="monthly-box" style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#6c5ce7;font-weight:600;">Total suscripciones/mes:</span>
          <span style="color:#e17055;font-weight:700;font-size:1.1rem;">${this.formatMoney(totalARS)} ARS</span>
        </div>
        ${totalUSD > 0 ? `<div style="text-align:right;font-size:0.8rem;color:#888;margin-top:4px;">${totalUSD} USD</div>` : ''}
      </div>
    `;
  },

  // ── Helpers ──────────────────────────────────────────
  formatMoney(amount) {
    return '$' + amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },

  formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${day} ${months[parseInt(month) - 1]} ${year}`;
  },

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());


