// Переключение видимости пароля
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
});

// Обработка формы авторизации
const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Здесь обычно будет отправка данных на сервер
    // В данном примере просто имитируем авторизацию
    
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.innerHTML;
    
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверка данных...';
    loginBtn.disabled = true;
    
    // Имитация задержки запроса
    setTimeout(() => {
        if(username && password) {
            // Успешная авторизация
            loginBtn.innerHTML = '<i class="fas fa-check"></i> Вход выполнен!';
            loginBtn.style.background = 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)';
            
            // Перенаправление на главную страницу
            setTimeout(() => {
                alert(`Добро пожаловать, ${username}! В реальной системе здесь будет перенаправление на главную страницу.`);
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
                loginBtn.style.background = 'linear-gradient(90deg, #1e5aa0 0%, #2a6bc0 100%)';
                loginForm.reset();
            }, 1000);
        } else {
            // Ошибка авторизации
            loginBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Ошибка входа';
            loginBtn.style.background = 'linear-gradient(90deg, #c62828 0%, #d32f2f 100%)';
            
            setTimeout(() => {
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
                loginBtn.style.background = 'linear-gradient(90deg, #1e5aa0 0%, #2a6bc0 100%)';
            }, 2000);
        }
    }, 1500);
});

// Добавляем эффект фокуса на поля ввода
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.querySelector('.input-icon').style.color = '#6bc0ff';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.querySelector('.input-icon').style.color = '#4dabf7';
    });
});