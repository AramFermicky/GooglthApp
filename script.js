// Глобальные переменные для Firebase
let auth, firestore, storage;

// Флаг для отслеживания инициализации Firebase
let firebaseInitialized = false;

// Инициализация Firebase
function initFirebase() {
  // Конфигурация Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyCpQojDm25EF03b0HExMo3qvLSeLUSpAW0",
    authDomain: "googlthapp-demo.firebaseapp.com",
    projectId: "googlthapp-demo",
    storageBucket: "googlthapp-demo.firebasestorage.app",
    messagingSenderId: "1046782939426",
    appId: "1:1046782939426:web:b4bf70511079efa26a557b",
    measurementId: "G-BQYJ3EJ1N2"
  };

  try {
    // Проверка, инициализирована ли уже Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Получаем сервисы Firebase
    auth = firebase.auth();
    firestore = firebase.firestore();
    storage = firebase.storage();
    
    firebaseInitialized = true;
    console.log('[Firebase] Инициализация успешна');
    
    // Инициализация приложения после Firebase
    initApp();
  } catch (error) {
    console.error('[Firebase] Ошибка инициализации:', error);
    document.body.innerHTML = `
      <div style="font-family: 'Google Sans', sans-serif; padding: 20px; text-align: center; color: #ea4335;">
        <h2>Ошибка инициализации Firebase</h2>
        <p>Не удалось подключиться к Firebase. Пожалуйста, проверьте конфигурацию.</p>
        <p style="font-size: 0.8rem; color: #5f6368;">Код ошибки: ${error.code || 'N/A'}</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Попробовать снова
        </button>
      </div>
    `;
  }
}

// Универсальные функции
function navigateTo(url) {
  document.body.classList.add('slide-in');
  setTimeout(() => {
    window.location.href = url;
  }, 300);
}

function showError(message, duration = 5000) {
  const error = document.createElement('div');
  error.className = 'auth-error';
  error.textContent = message;
  document.body.appendChild(error);
  
  setTimeout(() => {
    error.style.opacity = '1';
  }, 10);
  
  setTimeout(() => {
    error.style.opacity = '0';
    setTimeout(() => {
      error.remove();
    }, 300);
  }, duration);
}

function showSuccess(message, duration = 3000) {
  const success = document.createElement('div');
  success.className = 'auth-success';
  success.textContent = message;
  document.body.appendChild(success);
  
  setTimeout(() => {
    success.style.opacity = '1';
  }, 10);
  
  setTimeout(() => {
    success.style.opacity = '0';
    setTimeout(() => {
      success.remove();
    }, 300);
  }, duration);
}

// Инициализация приложения
function initApp() {
  // Добавляем функции в глобальный контекст
  window.navigateTo = navigateTo;
  window.showError = showError;
  window.showSuccess = showSuccess;
  
  // Проверка аутентификации
  auth.onAuthStateChanged((user) => {
    const currentPath = window.location.pathname;
    
    if (user) {
      // Пользователь авторизован
      if (currentPath.endsWith('old_user.html') || currentPath.endsWith('new_user.html')) {
        navigateTo('app.html');
      }
      
      // Обновляем информацию о пользователе в меню
      if (user.email) {
        document.querySelectorAll('.menu-email').forEach(el => {
          el.textContent = user.email;
        });
      }
      
      if (user.displayName) {
        document.querySelectorAll('.menu-title').forEach(el => {
          el.textContent = `${user.displayName} (GooglethApp)`;
        });
      }
    } else {
      // Пользователь не авторизован
      const protectedPaths = [
        'app.html',
        'profile.html',
        'create-group.html',
        'devices.html',
        'google-account.html',
        'new-chat.html',
        'edit-avatar.html'
      ];
      
      if (protectedPaths.some(path => currentPath.includes(path))) {
        navigateTo('old_user.html');
      }
    }
  });
  
  // Инициализация страниц
  initPageHandlers();
}

// Инициализация обработчиков страниц
function initPageHandlers() {
  const currentPath = window.location.pathname;
  
  // Обработчики для страницы регистрации
  if (currentPath.endsWith('new_user.html')) {
    setupRegistrationPage();
  }
  
  // Обработчики для страницы входа
  if (currentPath.endsWith('old_user.html')) {
    setupLoginPage();
  }
  
  // Обработчики для главной страницы
  if (currentPath.endsWith('app.html')) {
    setupAppPage();
  }
}

// Проверка email
function checkEmailAvailability() {
  const email = document.getElementById('signup-email')?.value || 
               document.getElementById('login-identifier')?.value;
  const statusEl = document.getElementById('email-status');
  
  if (!email || !statusEl) return;
  
  auth.fetchSignInMethodsForEmail(email)
    .then(methods => {
      if (methods.length > 0) {
        statusEl.textContent = 'Этот email уже используется';
        statusEl.style.color = '#ea4335';
      } else {
        statusEl.textContent = 'Email доступен';
        statusEl.style.color = '#34a853';
      }
    })
    .catch(error => {
      statusEl.textContent = 'Ошибка проверки';
      statusEl.style.color = '#ea4335';
    });
}

// Проверка силы пароля
function checkPasswordStrength() {
  const password = document.getElementById('signup-password')?.value;
  const strengthEl = document.getElementById('password-strength');
  
  if (!password || !strengthEl) return;
  
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  const strengthText = [
    'Слабый пароль',
    'Средний пароль',
    'Хороший пароль',
    'Надежный пароль'
  ][strength];
  
  strengthEl.textContent = strengthText;
  strengthEl.style.color = [
    '#ea4335',
    '#fbbc05',
    '#4285f4',
    '#34a853'
  ][strength];
}

// Проверка совпадения паролей
function checkPasswordMatch() {
  const password = document.getElementById('signup-password')?.value;
  const confirm = document.getElementById('signup-confirm')?.value;
  const matchEl = document.getElementById('password-match');
  
  if (!confirm || !matchEl) return;
  
  if (password === confirm) {
    matchEl.textContent = 'Пароли совпадают';
    matchEl.style.color = '#34a853';
  } else {
    matchEl.textContent = 'Пароли не совпадают';
    matchEl.style.color = '#ea4335';
  }
}

// Обработчик регистрации
function setupRegistrationPage() {
  // Обработчик регистрации
  const signupBtn = document.getElementById('signup-btn');
  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const name = document.getElementById('signup-name')?.value;
      const email = document.getElementById('signup-email')?.value;
      const password = document.getElementById('signup-password')?.value;
      const confirm = document.getElementById('signup-confirm')?.value;
      
      if (!name || !email || !password || !confirm) {
        window.showError('Пожалуйста, заполните все поля');
        return;
      }
      
      if (password !== confirm) {
        window.showError('Пароли не совпадают');
        return;
      }
      
      if (password.length < 6) {
        window.showError('Пароль должен быть не менее 6 символов');
        return;
      }
      
      try {
        // Регистрация пользователя
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Обновление профиля с именем
        await user.updateProfile({
          displayName: name
        });
        
        // Создание документа пользователя в Firestore
        await firestore.collection('users').doc(user.uid).set({
          name: name,
          email: email,
          avatar: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: {
            theme: 'light',
            notifications: true,
            language: 'ru'
          },
          status: 'online',
          lastSeen: new Date()
        });
        
        window.showSuccess('Регистрация успешна! Добро пожаловать в GooglthApp');
        setTimeout(() => {
          navigateTo('app.html');
        }, 1500);
      } catch (error) {
        let message = 'Ошибка регистрации. Пожалуйста, попробуйте еще раз.';
        if (error.code === 'auth/email-already-in-use') {
          message = 'Этот email уже используется. Попробуйте войти.';
        } else if (error.code === 'auth/weak-password') {
          message = 'Пароль слишком слабый. Используйте минимум 6 символов.';
        } else if (error.code === 'auth/invalid-email') {
          message = 'Неверный формат email.';
        }
        
        window.showError(message);
      }
    });
  }

  // Обработчик входа через Google
  const googleSignupBtn = document.getElementById('google-signup');
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', async () => {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Проверка существования документа пользователя
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
          // Создание документа пользователя, если его нет
          await firestore.collection('users').doc(user.uid).set({
            name: user.displayName,
            email: user.email,
            avatar: user.photoURL,
            createdAt: new Date(),
            updatedAt: new Date(),
            settings: {
              theme: 'light',
              notifications: true,
              language: 'ru'
            },
            status: 'online',
            lastSeen: new Date()
          });
        } else {
          // Обновление существующего документа
          await firestore.collection('users').doc(user.uid).update({
            name: user.displayName,
            email: user.email,
            avatar: user.photoURL,
            status: 'online',
            lastSeen: new Date()
          });
        }
        
        window.showSuccess('Вход через Google успешен!');
        setTimeout(() => {
          navigateTo('app.html');
        }, 1500);
      } catch (error) {
        let message = 'Ошибка входа через Google. Пожалуйста, попробуйте еще раз.';
        if (error.code === 'auth/popup-closed-by-user') {
          message = 'Окно авторизации закрыто. Пожалуйста, попробуйте снова.';
        }
        
        window.showError(message);
      }
    });
  }

  // Обработчик входа через email
  const emailSignupBtn = document.getElementById('email-signup');
  if (emailSignupBtn) {
    emailSignupBtn.addEventListener('click', () => {
      navigateTo('old_user.html');
    });
  }

  // Добавление обработчиков для проверки email
  const signupEmail = document.getElementById('signup-email');
  if (signupEmail) {
    signupEmail.addEventListener('blur', checkEmailAvailability);
  }

  // Добавление обработчиков для проверки пароля
  const signupPassword = document.getElementById('signup-password');
  if (signupPassword) {
    signupPassword.addEventListener('input', checkPasswordStrength);
  }
  
  const signupConfirm = document.getElementById('signup-confirm');
  if (signupConfirm) {
    signupConfirm.addEventListener('input', checkPasswordMatch);
  }
}

// Обработчик входа
function setupLoginPage() {
  // Обработчик входа
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const identifier = document.getElementById('login-identifier')?.value;
      const password = document.getElementById('login-password')?.value;
      
      if (!identifier || !password) {
        window.showError('Пожалуйста, заполните все поля');
        return;
      }
      
      try {
        // Вход пользователя
        const userCredential = await auth.signInWithEmailAndPassword(identifier, password);
        const user = userCredential.user;
        
        // Обновление статуса пользователя
        await firestore.collection('users').doc(user.uid).update({
          status: 'online',
          lastSeen: new Date()
        });
        
        window.showSuccess('Успешный вход! Добро пожаловать в GooglthApp');
        setTimeout(() => {
          navigateTo('app.html');
        }, 1000);
      } catch (error) {
        let message = 'Ошибка входа. Пожалуйста, проверьте email и пароль.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          message = 'Неверный email или пароль';
        } else if (error.code === 'auth/user-disabled') {
          message = 'Этот аккаунт был отключен. Обратитесь в поддержку.';
        } else if (error.code === 'auth/too-many-requests') {
          message = 'Слишком много попыток входа. Попробуйте позже.';
        }
        
        window.showError(message);
      }
    });
  }

  // Обработчик входа через Google
  const googleLoginBtn = document.getElementById('google-login');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Проверка существования документа пользователя
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
          // Создание документа пользователя, если его нет
          await firestore.collection('users').doc(user.uid).set({
            name: user.displayName,
            email: user.email,
            avatar: user.photoURL,
            createdAt: new Date(),
            updatedAt: new Date(),
            settings: {
              theme: 'light',
              notifications: true,
              language: 'ru'
            },
            status: 'online',
            lastSeen: new Date()
          });
        } else {
          // Обновление существующего документа
          await firestore.collection('users').doc(user.uid).update({
            name: user.displayName,
            email: user.email,
            avatar: user.photoURL,
            status: 'online',
            lastSeen: new Date()
          });
        }
        
        window.showSuccess('Вход через Google успешен!');
        setTimeout(() => {
          navigateTo('app.html');
        }, 1500);
      } catch (error) {
        let message = 'Ошибка входа через Google. Пожалуйста, попробуйте еще раз.';
        if (error.code === 'auth/popup-closed-by-user') {
          message = 'Окно авторизации закрыто. Пожалуйста, попробуйте снова.';
        }
        
        window.showError(message);
      }
    });
  }

  // Обработчик входа через email
  const emailLoginBtn = document.getElementById('email-login');
  if (emailLoginBtn) {
    emailLoginBtn.addEventListener('click', () => {
      navigateTo('old_user.html');
    });
  }

  // Обработчик забытого пароля
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const identifier = document.getElementById('login-identifier')?.value;
      if (!identifier) {
        window.showError('Пожалуйста, введите email');
        return;
      }
      
      try {
        await auth.sendPasswordResetEmail(identifier);
        window.showSuccess('Письмо для сброса пароля отправлено. Проверьте вашу почту.');
      } catch (error) {
        let message = 'Ошибка отправки письма. Пожалуйста, попробуйте еще раз.';
        if (error.code === 'auth/user-not-found') {
          message = 'Пользователь с таким email не найден.';
        }
        
        window.showError(message);
      }
    });
  }

  // Добавление обработчиков для проверки email
  const loginIdentifier = document.getElementById('login-identifier');
  if (loginIdentifier) {
    loginIdentifier.addEventListener('blur', checkEmailAvailability);
  }
}

// Обработчик главной страницы
function setupAppPage() {
  // Обработчик создания группы
  const createGroupBtn = document.getElementById('create-group-btn');
  const createGroupFooterBtn = document.getElementById('create-group-footer-btn');
  
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', () => {
      navigateTo('create-group.html');
    });
  }
  
  if (createGroupFooterBtn) {
    createGroupFooterBtn.addEventListener('click', () => {
      navigateTo('create-group.html');
    });
  }

  // Обработчик поиска контактов
  const findContactsBtn = document.getElementById('find-contacts-btn');
  if (findContactsBtn) {
    findContactsBtn.addEventListener('click', () => {
      navigateTo('find-contacts.html');
    });
  }

  // Обработчик нового чата
  const newChatBtn = document.getElementById('new-chat-btn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      navigateTo('new-chat.html');
    });
  }

  // Боковое меню
  const menuBtn = document.getElementById('menuBtn');
  const menuOverlay = document.getElementById('menuOverlay');
  const menuPanel = document.getElementById('menuPanel');
  
  if (menuBtn && menuOverlay && menuPanel) {
    menuBtn.addEventListener('click', () => {
      menuPanel.classList.add('active');
      menuOverlay.classList.add('active');
    });
    
    menuOverlay.addEventListener('click', () => {
      menuPanel.classList.remove('active');
      menuOverlay.classList.remove('active');
    });
  }

  // Обработчики меню
  const profileMenuItem = document.getElementById('profile-menu-item');
  const devicesMenuItem = document.getElementById('devices-menu-item');
  const googleAccountMenuItem = document.getElementById('google-account-menu-item');
  const logoutMenuItem = document.getElementById('logout-menu-item');
  
  if (profileMenuItem) {
    profileMenuItem.addEventListener('click', () => {
      navigateTo('profile.html');
    });
  }
  
  if (devicesMenuItem) {
    devicesMenuItem.addEventListener('click', () => {
      navigateTo('devices.html');
    });
  }
  
  if (googleAccountMenuItem) {
    googleAccountMenuItem.addEventListener('click', () => {
      navigateTo('google-account.html');
    });
  }
  
  if (logoutMenuItem) {
    logoutMenuItem.addEventListener('click', async () => {
      try {
        const user = auth.currentUser;
        
        if (user) {
          // Обновление статуса пользователя
          await firestore.collection('users').doc(user.uid).update({
            status: 'offline',
            lastSeen: new Date()
          });
        }
        
        // Выход из системы
        await auth.signOut();
        
        window.showSuccess('Вы успешно вышли из аккаунта');
        setTimeout(() => {
          navigateTo('old_user.html');
        }, 1500);
      } catch (error) {
        window.showError('Ошибка выхода из системы: ' + error.message);
      }
    });
  }

  // Обработчики для меню
  document.querySelectorAll('.background-option').forEach(option => {
    option.addEventListener('click', function() {
      // Удаление активного класса
      document.querySelectorAll('.background-option').forEach(opt => opt.classList.remove('active'));
      
      // Добавление активного класса
      this.classList.add('active');
      
      // Сохранение фона в настройках
      const background = this.className.split(' ')[1];
      document.body.setAttribute('data-chat-background', background);
      
      // Сохранение в Firestore (если пользователь авторизован)
      if (auth.currentUser) {
        firestore.collection('users').doc(auth.currentUser.uid).update({
          'settings.chatBackground': background
        }).catch(error => {
          console.error('Ошибка сохранения фона:', error);
        });
      }
    });
  });
  
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', function() {
      // Удаление активного класса
      document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
      
      // Добавление активного класса
      this.classList.add('active');
      
      // Установка темы
      const theme = this.className.split(' ')[1].split('-')[1];
      document.documentElement.setAttribute('data-theme', theme);
      
      // Сохранение в Firestore (если пользователь авторизован)
      if (auth.currentUser) {
        firestore.collection('users').doc(auth.currentUser.uid).update({
          'settings.theme': theme
        }).catch(error => {
          console.error('Ошибка сохранения темы:', error);
        });
      }
    });
  });

  // Загрузка онлайн-пользователей
  function loadOnlineUsers() {
    const onlineUsersContainer = document.getElementById('online-users');
    if (!onlineUsersContainer) return;
    
    // Очистка контейнера
    onlineUsersContainer.innerHTML = '';
    
    // Загрузка онлайн-пользователей
    firestore.collection('users')
      .where('status', '==', 'online')
      .onSnapshot(snapshot => {
        if (snapshot.empty) {
          onlineUsersContainer.innerHTML = `
            <div class="online-avatar-placeholder">
              <svg viewBox="0 0 24 24" width="80" height="80" fill="#4285F4">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-5-9h10v2H7z"/>
              </svg>
            </div>
            <p>Нет пользователей онлайн</p>
          `;
          return;
        }
        
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === 'online' && data.name) {
            const userElement = document.createElement('div');
            userElement.className = 'online-user';
            userElement.innerHTML = `
              <div class="online-avatar">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="#4285F4">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div class="online-info">
                <div class="online-name">${data.name}</div>
                <div class="online-status-text">Онлайн</div>
              </div>
            `;
            onlineUsersContainer.appendChild(userElement);
          }
        });
      });
  }
  
  // Инициализация загрузки онлайн-пользователей
  loadOnlineUsers();

  // Добавление анимации для кнопок действий
  setTimeout(() => {
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach((btn, index) => {
      setTimeout(() => {
        btn.classList.add('show');
      }, 100 * index);
    });
  }, 300);
}

// Проверка, загружена ли Firebase
if (typeof firebase !== 'undefined') {
  initFirebase();
} else {
  // Если Firebase не загружена, загружаем ее через CDN
  const firebaseScript = document.createElement('script');
  firebaseScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
  firebaseScript.onload = () => {
    const authScript = document.createElement('script');
    authScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
    authScript.onload = () => {
      const firestoreScript = document.createElement('script');
      firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
      firestoreScript.onload = initFirebase;
      document.head.appendChild(firestoreScript);
    };
    document.head.appendChild(authScript);
  };
  document.head.appendChild(firebaseScript);
}