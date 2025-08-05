// Универсальные функции для навигации
function navigateTo(url) {
  document.body.classList.add('slide-in');
  setTimeout(() => {
    window.location.href = url;
  }, 300);
}

// Показать сообщение об ошибке
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

// Показать сообщение об успехе
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

// Система аутентификации
const AuthSystem = {
  // Инициализация хранилища
  init() {
    if (!localStorage.getItem('googlthapp_users')) {
      localStorage.setItem('googlthapp_users', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('googlthapp_peers')) {
      localStorage.setItem('googlthapp_peers', JSON.stringify({}));
    }
    
    if (!localStorage.getItem('googlthapp_groups')) {
      localStorage.setItem('googlthapp_groups', JSON.stringify([]));
    }
  },
  
  // Хеширование пароля
  hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  },
  
  // Регистрация нового пользователя
  register(name, email, password) {
    const users = JSON.parse(localStorage.getItem('googlthapp_users'));
    
    if (users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'Этот email уже используется' };
    }
    
    const newUser = {
      id: Date.now().toString(),
      name: name,
      email: email,
      password: this.hashPassword(password),
      createdAt: new Date().toISOString(),
      peerId: this.generatePeerId(),
      avatar: null
    };
    
    users.push(newUser);
    localStorage.setItem('googlthapp_users', JSON.stringify(users));
    
    const peers = JSON.parse(localStorage.getItem('googlthapp_peers'));
    peers[newUser.id] = {
      connections: [],
      messages: []
    };
    localStorage.setItem('googlthapp_peers', JSON.stringify(peers));
    
    return { success: true, user: newUser };
  },
  
  // Вход пользователя
  login(email, password) {
    const users = JSON.parse(localStorage.getItem('googlthapp_users'));
    const hashedPassword = this.hashPassword(password);
    
    const user = users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.password === hashedPassword
    );
    
    if (user) {
      localStorage.setItem('googlthapp_currentUser', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        peerId: user.peerId,
        avatar: user.avatar,
        loggedInAt: new Date().toISOString()
      }));
      
      return { success: true, user: user };
    }
    
    return { success: false, message: 'Неверный email или пароль' };
  },
  
  // Проверка авторизации
  isAuthenticated() {
    return !!localStorage.getItem('googlthapp_currentUser');
  },
  
  // Получение текущего пользователя
  getCurrentUser() {
    const user = localStorage.getItem('googlthapp_currentUser');
    return user ? JSON.parse(user) : null;
  },
  
  // Выход из аккаунта
  logout() {
    localStorage.removeItem('googlthapp_currentUser');
  },
  
  // Проверка существования email
  emailExists(email) {
    const users = JSON.parse(localStorage.getItem('googlthapp_users'));
    return users.some(user => user.email.toLowerCase() === email.toLowerCase());
  },
  
  // Генерация уникального P2P ID
  generatePeerId() {
    return 'peer_' + Math.random().toString(36).substr(2, 9);
  },
  
  // Получение информации о пользователе по ID
  getUserById(userId) {
    const users = JSON.parse(localStorage.getItem('googlthapp_users'));
    return users.find(u => u.id === userId);
  },
  
  // Получение P2P-данных
  getPeerData() {
    return JSON.parse(localStorage.getItem('googlthapp_peers')) || {};
  },
  
  // Сохранение P2P-данных
  savePeerData(data) {
    localStorage.setItem('googlthapp_peers', JSON.stringify(data));
  },
  
  // Отправка P2P-сообщения
  sendP2PMessage(toUserId, message) {
    const currentUser = this.getCurrentUser();
    const peers = this.getPeerData();
    
    if (!currentUser || !peers[currentUser.id]) {
      return { success: false, message: 'Пользователь не авторизован' };
    }
    
    const timestamp = new Date().toISOString();
    
    if (!peers[currentUser.id].messages[toUserId]) {
      peers[currentUser.id].messages[toUserId] = [];
    }
    
    peers[currentUser.id].messages[toUserId].push({
      id: Date.now().toString(),
      text: message,
      sender: currentUser.id,
      timestamp: timestamp,
      status: 'sent'
    });
    
    if (!peers[toUserId]) {
      peers[toUserId] = { connections: [], messages: {} };
    }
    
    if (!peers[toUserId].messages[currentUser.id]) {
      peers[toUserId].messages[currentUser.id] = [];
    }
    
    peers[toUserId].messages[currentUser.id].push({
      id: Date.now().toString(),
      text: message,
      sender: currentUser.id,
      timestamp: timestamp,
      status: 'delivered'
    });
    
    this.savePeerData(peers);
    return { success: true };
  },
  
  // Получение сообщений с другим пользователем
  getMessagesWith(userId) {
    const currentUser = this.getCurrentUser();
    const peers = this.getPeerData();
    
    if (!currentUser || !peers[currentUser.id] || !peers[currentUser.id].messages[userId]) {
      return [];
    }
    
    return peers[currentUser.id].messages[userId];
  },
  
  // Поиск пользователей
  searchUsers(query) {
    const users = JSON.parse(localStorage.getItem('googlthapp_users'));
    const currentUser = this.getCurrentUser();
    
    return users.filter(user => 
      user.id !== currentUser.id &&
      (user.name.toLowerCase().includes(query.toLowerCase()) || 
       user.email.toLowerCase().includes(query.toLowerCase()))
    );
  },
  
  // Добавление в контакты
  addToContacts(userId) {
    const currentUser = this.getCurrentUser();
    const peers = this.getPeerData();
    
    if (!peers[currentUser.id].connections.includes(userId)) {
      peers[currentUser.id].connections.push(userId);
      this.savePeerData(peers);
      return { success: true };
    }
    
    return { success: false, message: 'Уже в контактах' };
  },
  
  // Получение групп пользователя
  getUserGroups() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return [];
    
    const groups = JSON.parse(localStorage.getItem('googlthapp_groups') || '[]');
    return groups.filter(group => group.members.includes(currentUser.id));
  },
  
  // Создание новой группы
  createGroup(name, description, members, avatar = null) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return { success: false, message: 'Пользователь не авторизован' };
    
    const groups = JSON.parse(localStorage.getItem('googlthapp_groups') || '[]');
    const newGroup = {
      id: Date.now().toString(),
      name: name,
      description: description,
      creatorId: currentUser.id,
      members: members,
      createdAt: new Date().toISOString(),
      avatar: avatar
    };
    
    groups.push(newGroup);
    localStorage.setItem('googlthapp_groups', JSON.stringify(groups));
    
    return { success: true, group: newGroup };
  }
};

// P2P-менеджер для WebRTC
class P2PManager {
  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onMessage = null;
    this.onConnectionStatus = null;
    
    // Публичные STUN-серверы Google
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }
  
  // Инициализация WebRTC
  async init() {
    try {
      this.peerConnection = new RTCPeerConnection(this.config);
      
      // Обработка ICE candidates
      this.peerConnection.onicecandidate = event => {
        if (event.candidate) {
          console.log('Найден ICE кандидат');
        }
      };
      
      // Обработка входящих данных
      this.peerConnection.ondatachannel = event => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка инициализации WebRTC:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Создание канала данных
  createDataChannel() {
    if (!this.peerConnection) {
      return { success: false, message: 'Соединение не инициализировано' };
    }
    
    this.dataChannel = this.peerConnection.createDataChannel('googlthapp-messages');
    this.setupDataChannel();
    return { success: true };
  }
  
  // Настройка канала данных
  setupDataChannel() {
    if (!this.dataChannel) return;
    
    this.dataChannel.onopen = () => {
      console.log('Канал данных открыт');
      if (this.onConnectionStatus) {
        this.onConnectionStatus('connected');
      }
    };
    
    this.dataChannel.onclose = () => {
      console.log('Канал данных закрыт');
      if (this.onConnectionStatus) {
        this.onConnectionStatus('disconnected');
      }
    };
    
    this.dataChannel.onerror = error => {
      console.error('Ошибка канала данных:', error);
      if (this.onConnectionStatus) {
        this.onConnectionStatus('error', error);
      }
    };
    
    this.dataChannel.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        if (this.onMessage) {
          this.onMessage(message);
        }
      } catch (e) {
        console.error('Ошибка парсинга сообщения:', e);
      }
    };
  }
  
  // Отправка сообщения через P2P
  sendMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
  
  // Создание предложения (offer)
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      return { success: true, offer: offer };
    } catch (error) {
      console.error('Ошибка создания предложения:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Установка удаленного описания
  async setRemoteDescription(description) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
      return { success: true };
    } catch (error) {
      console.error('Ошибка установки удаленного описания:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Добавление ICE кандидата
  async addIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      return { success: true };
    } catch (error) {
      console.error('Ошибка добавления ICE кандидата:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Завершение соединения
  close() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.onConnectionStatus) {
      this.onConnectionStatus('disconnected');
    }
  }
}

// Инициализация системы при загрузке
document.addEventListener('DOMContentLoaded', () => {
  AuthSystem.init();
  const p2pManager = new P2PManager();
  
  // Сохранение P2P-менеджера в глобальном контексте
  window.p2pManager = p2pManager;
  
  // Обновление информации о пользователе по всему приложению
  function updateUserInfo() {
    const currentUser = AuthSystem.getCurrentUser();
    if (!currentUser) return;
    
    // Обновляем информацию в меню
    document.querySelectorAll('.menu-email').forEach(el => {
      el.textContent = currentUser.email;
    });
    
    document.querySelectorAll('.menu-title').forEach(el => {
      el.textContent = `${currentUser.name} (GooglethApp)`;
    });
    
    // Обновляем информацию в профиле, если мы на странице профиля
    if (window.location.pathname.endsWith('profile.html')) {
      document.getElementById('profile-name').textContent = currentUser.name;
      document.getElementById('profile-email').textContent = currentUser.email;
      document.getElementById('profile-id').textContent = `ID: ${currentUser.id.substring(0, 8)}...`;
      document.getElementById('profile-join-date').textContent = `Присоединился: ${new Date().toLocaleDateString()}`;
      
      // Обновляем аватар
      if (currentUser.avatar) {
        document.querySelector('.profile-avatar-large').style.backgroundImage = `url(${currentUser.avatar})`;
        document.querySelector('.profile-avatar-large').style.backgroundColor = 'transparent';
        document.querySelector('.profile-avatar-large').innerHTML = '';
      }
    }
    
    // Обновляем аватар в шапке
    if (document.querySelector('.app-title')) {
      const appTitle = document.querySelector('.app-title');
      appTitle.innerHTML = `
        <span class="G">G</span>
        <span class="o">o</span>
        <span class="o">o</span>
        <span class="g">g</span>
        <span class="l">l</span>
        <span class="t">t</span>
        <span class="h">h</span>
        <span class="A">A</span>
        <span class="p">p</span>
        <span class="p">p</span>
      `;
    }
  }
  
  // Вызываем обновление информации при загрузке
  updateUserInfo();
  
  // Также обновляем при каждом изменении страницы
  window.onpopstate = updateUserInfo;
  
  // Проверка авторизации на страницах, требующих входа
  if (window.location.pathname.endsWith('app.html') || 
      window.location.pathname.endsWith('settings.html') ||
      window.location.pathname.endsWith('p2p-chat.html') ||
      window.location.pathname.endsWith('profile.html') ||
      window.location.pathname.endsWith('create-group.html') ||
      window.location.pathname.endsWith('devices.html') ||
      window.location.pathname.endsWith('google-account.html') ||
      window.location.pathname.endsWith('new-chat.html') ||
      window.location.pathname.endsWith('edit-avatar.html')) {
    if (!AuthSystem.isAuthenticated()) {
      navigateTo('old_user.html');
      return;
    }
    
    // Обновление информации о пользователе
    updateUserInfo();
  }
  
  // Проверка авторизации на страницах авторизации
  if (window.location.pathname.endsWith('new_user.html') || 
      window.location.pathname.endsWith('old_user.html')) {
    if (AuthSystem.isAuthenticated()) {
      navigateTo('app.html');
      return;
    }
  }
  
  // Инициализация меню
  const menuBtn = document.getElementById('menuBtn');
  const menuPanel = document.getElementById('menuPanel');
  const menuOverlay = document.getElementById('menuOverlay');
  
  if (menuBtn && menuPanel && menuOverlay) {
    menuBtn.addEventListener('click', () => {
      menuPanel.classList.add('active');
      menuOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
    
    menuOverlay.addEventListener('click', () => {
      menuPanel.classList.remove('active');
      menuOverlay.classList.remove('active');
      document.body.style.overflow = 'auto';
    });
  }
  
  // Анимация появления кнопок действий
  if (document.querySelector('.action-btn')) {
    setTimeout(() => {
      document.querySelectorAll('.action-btn').forEach((btn, index) => {
        setTimeout(() => {
          btn.classList.add('show');
        }, 100 + index * 50);
      });
    }, 200);
  }
  
  // Обработка выбора фона
  document.querySelectorAll('.background-option').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.background-option').forEach(opt => {
        opt.classList.remove('active');
      });
      this.classList.add('active');
      
      // Визуальная обратная связь
      setTimeout(() => {
        const feedback = document.createElement('div');
        feedback.className = 'feedback';
        feedback.textContent = 'Фон чата изменен!';
        feedback.style.cssText = `
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9rem;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s;
        `;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
          feedback.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
          feedback.style.opacity = '0';
          setTimeout(() => {
            feedback.remove();
          }, 300);
        }, 2000);
      }, 150);
    });
  });
  
  // Обработка выбора темы
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('active');
      });
      this.classList.add('active');
      
      // Визуальная обратная связь
      setTimeout(() => {
        const feedback = document.createElement('div');
        feedback.className = 'feedback';
        feedback.textContent = 'Тема изменена!';
        feedback.style.cssText = `
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: #4285f4;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9rem;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s;
        `;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
          feedback.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
          feedback.style.opacity = '0';
          setTimeout(() => {
            feedback.remove();
          }, 300);
        }, 2000);
      }, 150);
    });
  });
  
  // Анимация загрузки бара на splash.html
  if (document.querySelector('.loading-fill')) {
    setTimeout(() => {
      document.querySelector('.loading-fill').style.width = '100%';
    }, 300);
  }
  
  // Эффект нажатия для кнопок
  document.querySelectorAll('.google-btn, .primary-btn, .menu-item, .setting-item').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
  
  // Обработка регистрации
  const signupBtn = document.getElementById('signup-btn');
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;
      
      if (!name || !email || !password || !confirm) {
        showError('Пожалуйста, заполните все поля');
        return;
      }
      
      if (password !== confirm) {
        showError('Пароли не совпадают');
        return;
      }
      
      if (password.length < 6) {
        showError('Пароль должен быть не менее 6 символов');
        return;
      }
      
      // Проверка существования email
      if (AuthSystem.emailExists(email)) {
        showError('Этот email уже используется');
        return;
      }
      
      // Регистрация пользователя
      const result = AuthSystem.register(name, email, password);
      
      if (result.success) {
        showSuccess('Регистрация успешна! Добро пожаловать в GooglthApp');
        setTimeout(() => {
          navigateTo('app.html');
        }, 1500);
      } else {
        showError(result.message);
      }
    });
  }
  
  // Обработка входа
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const identifier = document.getElementById('login-identifier').value;
      const password = document.getElementById('login-password').value;
      
      if (!identifier || !password) {
        showError('Пожалуйста, заполните все поля');
        return;
      }
      
      // Вход пользователя
      const result = AuthSystem.login(identifier, password);
      
      if (result.success) {
        showSuccess('Успешный вход! Добро пожаловать в GooglthApp');
        setTimeout(() => {
          navigateTo('app.html');
        }, 1000);
      } else {
        showError(result.message);
      }
    });
  }
  
  // Обработка входа через Google
  document.querySelectorAll('#google-signup, #google-login').forEach(btn => {
    btn.addEventListener('click', () => {
      showError('Войти в гугл аккаунт через http.googlthapp.com не удалось :(', 5000);
    });
  });
  
  // Обработка выхода
  const logoutItems = document.querySelectorAll('.menu-item.danger');
  logoutItems.forEach(item => {
    item.addEventListener('click', () => {
      AuthSystem.logout();
      showSuccess('Вы успешно вышли из аккаунта');
      setTimeout(() => {
        navigateTo('old_user.html');
      }, 1500);
    });
  });
  
  // Инициализация P2P-системы на странице приложения
  if (window.location.pathname.endsWith('app.html')) {
    // Инициализация WebRTC
    p2pManager.init().then(result => {
      if (result.success) {
        console.log('WebRTC инициализирован');
        p2pManager.createDataChannel();
        
        // Обработка входящих сообщений
        p2pManager.onMessage = (message) => {
          if (message.type === 'text') {
            const currentUser = AuthSystem.getCurrentUser();
            AuthSystem.sendP2PMessage(message.senderId, message.text);
            
            // Показать уведомление о новом сообщении
            showSuccess(`Новое сообщение от ${message.senderName}`);
          }
        };
        
        // Обработка статуса соединения
        p2pManager.onConnectionStatus = (status, error) => {
          console.log('Статус P2P-соединения:', status);
          
          if (status === 'error') {
            showError('Ошибка P2P-соединения. Используем резервный метод.');
          }
        };
      } else {
        console.warn('WebRTC не поддерживается в этом браузере. Используем резервный метод хранения.');
      }
    });
    
    // Загрузка групп пользователя
    const loadUserGroups = () => {
      const groups = AuthSystem.getUserGroups();
      const groupsContainer = document.getElementById('groups-list');
      
      if (!groupsContainer) return;
      
      if (groups.length === 0) {
        groupsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <p>У вас пока нет групп</p>
            <button class="primary-btn" onclick="navigateTo('create-group.html')">Создать группу</button>
          </div>
        `;
        return;
      }
      
      groupsContainer.innerHTML = groups.map(group => `
        <div class="group-item" onclick="navigateToChat('${group.id}', '${group.name}', 'group')">
          <div class="group-avatar">
            ${group.avatar ? `<img src="${group.avatar}" alt="${group.name}">` : group.name.charAt(0)}
          </div>
          <div class="group-info">
            <div class="group-name">${group.name}</div>
            <div class="group-members">${group.members.length} участников</div>
          </div>
        </div>
      `).join('');
    };
    
    loadUserGroups();
  }
  
  // Обработка поиска контактов
  if (window.location.pathname.endsWith('find-contacts.html')) {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    
    if (searchInput && resultsContainer) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value;
        
        if (query.length < 2) {
          resultsContainer.innerHTML = '';
          return;
        }
        
        const results = AuthSystem.searchUsers(query);
        
        resultsContainer.innerHTML = results.length > 0 
          ? results.map(user => `
            <div class="contact-item" onclick="startChat('${user.id}', '${user.name}')">
              <div class="contact-avatar">${user.name.charAt(0)}</div>
              <div class="contact-info">
                <div class="contact-name">${user.name}</div>
                <div class="contact-email">${user.email}</div>
              </div>
              <button class="add-contact-btn" onclick="addToContacts('${user.id}', event)">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </button>
            </div>
          `).join('')
          : '<div class="no-results">Пользователи не найдены</div>';
      });
    }
    
    // Глобальные функции для поиска
    window.startChat = (userId, userName) => {
      // Сохранение выбранного пользователя в сессии
      sessionStorage.setItem('p2p_target_user', JSON.stringify({ id: userId, name: userName }));
      navigateTo('p2p-chat.html');
    };
    
    window.addToContacts = (userId, event) => {
      event.stopPropagation();
      const result = AuthSystem.addToContacts(userId);
      
      if (result.success) {
        showSuccess('Пользователь добавлен в контакты');
        // Обновить кнопку
        const btn = event.target.closest('.add-contact-btn') || event.target;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
          </svg>
        `;
        btn.style.color = '#34a853';
      } else {
        showError(result.message);
      }
    };
  }
  
  // Обработка P2P-чата
  if (window.location.pathname.endsWith('p2p-chat.html')) {
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHeader = document.querySelector('.chat-header');
    
    if (chatMessages && messageInput && sendBtn) {
      const targetUser = JSON.parse(sessionStorage.getItem('p2p_target_user'));
      
      if (!targetUser) {
        navigateTo('find-contacts.html');
        return;
      }
      
      // Обновление заголовка чата
      if (chatHeader) {
        chatHeader.innerHTML = `
          <button class="back-btn" onclick="window.history.back()">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <div class="chat-title">
            <div class="chat-avatar">${targetUser.name.charAt(0)}</div>
            <div>
              <div class="chat-name">${targetUser.name}</div>
              <div class="chat-status">Подключен через P2P</div>
            </div>
          </div>
        `;
      }
      
      // Загрузка истории сообщений
      const loadMessages = () => {
        const messages = AuthSystem.getMessagesWith(targetUser.id);
        
        chatMessages.innerHTML = messages.length > 0
          ? messages.map(msg => `
            <div class="message ${msg.sender === AuthSystem.getCurrentUser().id ? 'message-sent' : 'message-received'}">
              <div class="message-content">${msg.text}</div>
              <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          `).join('')
          : '<div class="no-messages">Нет сообщений. Начните разговор!</div>';
        
        // Прокрутка к последнему сообщению
        chatMessages.scrollTop = chatMessages.scrollHeight;
      };
      
      loadMessages();
      
      // Отправка сообщения
      const sendMessage = () => {
        const text = messageInput.value.trim();
        if (!text) return;
        
        // Попытка отправить через P2P
        const currentUser = AuthSystem.getCurrentUser();
        const p2pResult = p2pManager.sendMessage({
          type: 'text',
          text: text,
          senderId: currentUser.id,
          senderName: currentUser.name
        });
        
        if (p2pResult || true) { // Всегда сохраняем в локальное хранилище как резерв
          AuthSystem.sendP2PMessage(targetUser.id, text);
          messageInput.value = '';
          loadMessages();
        } else {
          showError('Не удалось отправить сообщение через P2P. Проверьте соединение.');
        }
      };
      
      sendBtn.addEventListener('click', sendMessage);
      
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
      
      // Обновление каждые 3 секунды
      setInterval(loadMessages, 3000);
    }
  }
  
  // Обработка создания группы
  if (window.location.pathname.endsWith('create-group.html')) {
    const searchInput = document.getElementById('member-search');
    const membersList = document.getElementById('members-list');
    
    if (searchInput && membersList) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value;
        
        if (query.length < 2) {
          membersList.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">👥</div>
              <p>Добавьте участников в группу</p>
            </div>
          `;
          return;
        }
        
        const results = AuthSystem.searchUsers(query);
        
        if (results.length > 0) {
          membersList.innerHTML = results.map(user => `
            <div class="contact-item" onclick="toggleMember('${user.id}', this)">
              <div class="contact-avatar">${user.name.charAt(0)}</div>
              <div class="contact-info">
                <div class="contact-name">${user.name}</div>
                <div class="contact-email">${user.email}</div>
              </div>
              <div class="member-checkbox">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
          `).join('');
        } else {
          membersList.innerHTML = `
            <div class="no-results">
              Пользователи не найдены
            </div>
          `;
        }
      });
    }
    
    // Выбор участников
    window.toggleMember = (userId, element) => {
      element.classList.toggle('selected');
      
      const checkbox = element.querySelector('.member-checkbox svg');
      if (element.classList.contains('selected')) {
        checkbox.innerHTML = `
          <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        `;
      } else {
        checkbox.innerHTML = `
          <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
        `;
      }
    };
    
    // Создание группы
    document.getElementById('create-group-btn').addEventListener('click', () => {
      const groupName = document.getElementById('group-name').value;
      const groupDescription = document.getElementById('group-description').value;
      
      if (!groupName) {
        showError('Введите название группы');
        return;
      }
      
      // Получаем выбранных участников
      const selectedMembers = [];
      document.querySelectorAll('.contact-item.selected').forEach(item => {
        const userId = item.getAttribute('onclick').match(/'([^']+)'/)[1];
        selectedMembers.push(userId);
      });
      
      if (selectedMembers.length === 0) {
        showError('Выберите хотя бы одного участника');
        return;
      }
      
      // Добавляем текущего пользователя как создателя
      const currentUser = AuthSystem.getCurrentUser();
      selectedMembers.push(currentUser.id);
      
      // Сохраняем группу
      let groups = JSON.parse(localStorage.getItem('googlthapp_groups') || '[]');
      const newGroup = {
        id: Date.now().toString(),
        name: groupName,
        description: groupDescription,
        creatorId: currentUser.id,
        members: selectedMembers,
        createdAt: new Date().toISOString(),
        avatar: document.getElementById('group-avatar').style.backgroundImage ? 
                 document.getElementById('group-avatar').style.backgroundImage.replace('url("', '').replace('")', '') : null
      };
      
      groups.push(newGroup);
      localStorage.setItem('googlthapp_groups', JSON.stringify(groups));
      
      showSuccess('Группа создана успешно!');
      setTimeout(() => {
        navigateTo('app.html');
      }, 1500);
    });
  }
  
  // Обработка страницы профиля
  if (window.location.pathname.endsWith('profile.html')) {
    const currentUser = AuthSystem.getCurrentUser();
    if (currentUser) {
      document.getElementById('profile-name').textContent = currentUser.name;
      document.getElementById('profile-email').textContent = currentUser.email;
      document.getElementById('profile-id').textContent = `ID: ${currentUser.id.substring(0, 8)}...`;
      document.getElementById('profile-join-date').textContent = `Присоединился: ${new Date().toLocaleDateString()}`;
      
      // Обновляем аватар
      if (currentUser.avatar) {
        document.querySelector('.profile-avatar-large').style.backgroundImage = `url(${currentUser.avatar})`;
        document.querySelector('.profile-avatar-large').style.backgroundColor = 'transparent';
        document.querySelector('.profile-avatar-large').innerHTML = '';
      }
    }
    
    // Обработка изменения аватара
    document.querySelector('.profile-avatar-large').addEventListener('click', () => {
      navigateTo('edit-avatar.html?type=profile');
    });
  }
  
  // Обработка редактора аватара
  if (window.location.pathname.endsWith('edit-avatar.html')) {
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatar-preview');
    const cropControls = document.querySelector('.crop-controls');
    
    // Определяем тип аватара (profile или group)
    const urlParams = new URLSearchParams(window.location.search);
    const avatarType = urlParams.get('type');
    
    avatarInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(event) {
        avatarPreview.src = event.target.result;
        avatarPreview.style.display = 'block';
        cropControls.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    });
    
    // Обработка обрезки
    document.getElementById('crop-btn').addEventListener('click', function() {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const image = avatarPreview;
      
      // Получаем размеры изображения
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      
      // Устанавливаем размеры canvas
      canvas.width = 300;
      canvas.height = 300;
      
      // Рисуем изображение на canvas с обрезкой
      context.drawImage(image, 0, 0, width, height, 0, 0, 300, 300);
      
      // Сохраняем обрезанное изображение
      const croppedImage = canvas.toDataURL('image/jpeg');
      
      // Сохраняем в зависимости от типа
      if (avatarType === 'profile') {
        const currentUser = AuthSystem.getCurrentUser();
        currentUser.avatar = croppedImage;
        localStorage.setItem('googlthapp_currentUser', JSON.stringify(currentUser));
        
        // Обновляем список пользователей
        const users = JSON.parse(localStorage.getItem('googlthapp_users'));
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
          users[userIndex].avatar = croppedImage;
          localStorage.setItem('googlthapp_users', JSON.stringify(users));
        }
      } else if (avatarType === 'group') {
        // Сохраняем в сессию для последующего использования при создании группы
        sessionStorage.setItem('group-avatar', croppedImage);
      }
      
      showSuccess('Фото успешно обрезано!');
      setTimeout(() => {
        window.history.back();
      }, 1000);
    });
    
    // Отмена обрезки
    document.getElementById('cancel-btn').addEventListener('click', () => {
      window.history.back();
    });
  }
});