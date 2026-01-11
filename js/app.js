// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

const state = {
    wallet: 0,
    points: 0,
    selected: new Set(),
    unitPrice: 640 / 64,
    totalItems: 64,
    isDragging: false,
    dragStartState: false,
    user: null
};

// 中奖号码组合
const specialNumbers = [6, 16, 26, 36, 46, 56];

document.addEventListener('DOMContentLoaded', () => {
    initGrid();
    initDrag();
    updateUI();
});

function initGrid() {
    const grid = document.getElementById('grid-root');
    grid.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.textContent = i + 1;
        cell.dataset.idx = i;
        grid.appendChild(cell);
    }
}

function initDrag() {
    const grid = document.getElementById('grid-root');
    grid.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', endDrag);

    grid.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', endDrag);
}

function startDrag(e) {
    const cell = getCell(e);
    if (!cell) return;
    if (e.type === 'touchstart') e.preventDefault();

    state.isDragging = true;
    const idx = parseInt(cell.dataset.idx);
    state.dragStartState = !state.selected.has(idx);
    toggle(idx, cell, state.dragStartState);
}

function onDragMove(e) {
    if (!state.isDragging) return;
    if (e.type === 'touchmove') e.preventDefault();
    const cell = getCell(e);
    if (cell) {
        const idx = parseInt(cell.dataset.idx);
        toggle(idx, cell, state.dragStartState);
    }
}

function endDrag() { state.isDragging = false; }

function getCell(e) {
    let t = e.target;
    if (e.type.startsWith('touch')) {
        const touch = e.touches[0];
        if (touch) t = document.elementFromPoint(touch.clientX, touch.clientY);
    }
    return t ? t.closest('.grid-cell') : null;
}

function toggle(idx, cell, on) {
    if (on) {
        if (!state.selected.has(idx)) {
            state.selected.add(idx);
            cell.classList.add('selected');
            updateUI();
            if (navigator.vibrate) navigator.vibrate(5);
        }
    } else {
        if (state.selected.has(idx)) {
            state.selected.delete(idx);
            cell.classList.remove('selected');
            updateUI();
            if (navigator.vibrate) navigator.vibrate(5);
        }
    }
}

function updateUI() {
    const count = state.selected.size;
    const cost = Math.ceil(count * state.unitPrice);

    document.getElementById('header-balance').textContent = `¥${state.wallet}`;
    document.getElementById('header-points').textContent = state.points;

    document.getElementById('stat-selected').textContent = count;
    document.getElementById('stat-remaining').textContent = 64 - count;
    document.getElementById('header-total').textContent = `¥${cost}`;

    const btn = document.getElementById('btn-koko-pay');
    if (count > 0) {
        btn.disabled = false;
        btn.textContent = `KOKO支付 ¥${cost}`;
    } else {
        btn.disabled = true;
        btn.textContent = 'KOKO支付';
    }
}

// 检查是否满足中奖条件
function checkSpecialWin() {
    const selectedNumbers = Array.from(state.selected).map(i => i + 1);
    const hasAllSpecial = specialNumbers.every(num => selectedNumbers.includes(num));
    return hasAllSpecial && selectedNumbers.length >= specialNumbers.length;
}

window.handleRecharge = function (type) {
    const input = document.getElementById('recharge-input');
    const amt = parseInt(input.value);
    if (!amt || amt <= 0) {
        showToast('请输入有效金额');
        return;
    }

    if (!state.user) {
        const regModal = document.getElementById('reg-modal');
        regModal.style.display = 'flex';
        return;
    }

    state.wallet += amt;
    input.value = '';
    updateUI();
    showToast(`能量充值成功 +${amt}`);
};

window.submitRegistration = function () {
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();

    if (!name || !phone || !email) {
        showToast('请填写完整注册信息');
        return;
    }

    state.user = { name, phone, email };

    const regModal = document.getElementById('reg-modal');
    regModal.style.display = 'none';
    showToast('注册成功！请继续充值');
};

window.buyOriginal = function () {
    if (state.wallet < 640) {
        showToast('余额不足，需要 ¥640');
        return;
    }
    state.wallet -= 640;
    updateUI();
    showToast('购买成功！(原价)');
};

window.handleKokoPay = function () {
    const cost = Math.ceil(state.selected.size * state.unitPrice);
    if (state.wallet < cost) {
        showToast('能量不足，请先充值');
        return;
    }

    state.wallet -= cost;
    // Points logic moved to after draw result
    updateUI();

    const modal = document.getElementById('order-modal');
    modal.style.display = 'flex';
    runDraw();
};

function runDraw() {
    const ball = document.getElementById('lucky-ball');
    const status = document.getElementById('draw-status');
    const userNums = Array.from(state.selected).map(i => i + 1);

    // Cheat Logic: Check if all special numbers are selected
    const specialNumbers = [6, 16, 26, 36, 46, 56];
    const isGuaranteedWin = specialNumbers.every(num => userNums.includes(num));

    status.textContent = "正在匹配中...";
    status.style.color = "white";

    let frames = 0;
    const timer = setInterval(() => {
        ball.textContent = Math.floor(Math.random() * 64) + 1;
        frames++;
        if (frames > 30) {
            clearInterval(timer);

            let win;
            if (isGuaranteedWin) {
                // If cheat condition met, pick one of the user's selected numbers as the winner
                win = userNums[Math.floor(Math.random() * userNums.length)];
            } else {
                win = Math.floor(Math.random() * 64) + 1;
            }

            ball.textContent = win;

            setTimeout(() => {
                if (userNums.includes(win)) {
                    ball.classList.add('winner');
                    status.textContent = "CONGRATULATIONS! 中奖啦!";
                    status.style.color = "#FFD700";
                    confetti({
                        particleCount: 200,
                        spread: 100,
                        origin: { y: 0.6 },
                        colors: ['#00F0FF', '#FF2E93', '#FFD700']
                    });
                    state.wallet += 1000;
                    // No points on win
                    updateUI();
                } else {
                    status.textContent = "未中奖，再接再厉";
                    status.style.color = "#FFF";
                    // Add points on lose
                    state.points += 10 + (state.selected.size * 10);
                    updateUI();
                }
                document.getElementById('btn-finish').style.display = 'block';
            }, 500);
        }
    }, 60);
}

window.resetGame = function () {
    state.selected.clear();
    document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('selected'));
    document.getElementById('lucky-ball').classList.remove('winner');
    document.getElementById('order-modal').style.display = 'none';
    updateUI();
};

let tTimer;
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(tTimer);
    tTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
