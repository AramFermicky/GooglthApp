// ======================================================
// GOOGLTHAPP - Firebase Web SDK Implementation
// Version: 2.1.5
// Last Updated: 2023-10-15
// Author: GooglthApp Development Team
// Description: Полная реализация клиентской части приложения
// с использованием Firebase Web SDK
// ======================================================

// ======================================================
// 1. ИНИЦИАЛИЗАЦИЯ FIREBASE
// ======================================================

/**
 * Инициализация Firebase приложения
 * @returns {Object} Firebase app instance
 */
function initializeFirebase() {
  // Проверяем, инициализирована ли уже Firebase
  if (window.firebase && firebase.apps.length > 0) {
    console.log('[Firebase] Firebase уже инициализирована');
    return firebase.app();
  }
  
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
  
  // Инициализация Firebase
  try {
    const app = firebase.initializeApp(firebaseConfig);
    console.log('[Firebase] Инициализация успешна');
    
    // Инициализация Analytics (если доступно)
    if (typeof firebase.analytics === 'function') {
      firebase.analytics();
      console.log('[Firebase] Analytics инициализирован');
    }
    
    return app;
  } catch (error) {
    console.error('[Firebase] Ошибка инициализации:', error);
    throw new Error('Не удалось инициализировать Firebase: ' + error.message);
  }
}

// Инициализация Firebase при загрузке
let firebaseApp;
try {
  firebaseApp = initializeFirebase();
} catch (error) {
  console.error('[Firebase] Критическая ошибка:', error);
  document.body.innerHTML = `
    <div style="font-family: 'Google Sans', sans-serif; padding: 20px; text-align: center; color: #ea4335;">
      <h2>Ошибка инициализации</h2>
      <p>Не удалось подключиться к Firebase. Пожалуйста, проверьте подключение к интернету и повторите попытку.</p>
      <p style="font-size: 0.8rem; color: #5f6368;">Код ошибки: ${error.code || 'N/A'}</p>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Попробовать снова
      </button>
    </div>
  `;
}

// Получение сервисов Firebase
const auth = firebase.auth();
const firestore = firebase.firestore();
const storage = firebase.storage();
const functions = firebase.functions();

// ======================================================
// 2. УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ======================================================

/**
 * Генерация уникального ID
 * @returns {string} Уникальный ID
 */
function generateUniqueId() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Хеширование пароля (базовая реализация)
 * @param {string} password Пароль для хеширования
 * @returns {string} Хеш пароля
 */
function hashPassword(password) {
  let hash = 0;
  if (password.length === 0) return hash;
  
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Проверка валидности email
 * @param {string} email Email для проверки
 * @returns {boolean} Валиден ли email
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Проверка силы пароля
 * @param {string} password Пароль для проверки
 * @returns {number} Уровень сложности (0-4)
 */
function checkPasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  return strength;
}

/**
 * Форматирование даты
 * @param {Date} date Дата для форматирования
 * @returns {string} Отформатированная дата
 */
function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  const now = new Date();
  
  // Если сегодня
  if (d.getDate() === now.getDate() && 
      d.getMonth() === now.getMonth() && 
      d.getFullYear() === now.getFullYear()) {
    return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
  
  // Если вчера
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.getDate() === yesterday.getDate() && 
      d.getMonth() === yesterday.getMonth() && 
      d.getFullYear() === yesterday.getFullYear()) {
    return 'Вчера ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
  
  // Если в этом году
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], {month: 'short', day: 'numeric'}) + 
           ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
  
  // Иначе полная дата
  return d.toLocaleDateString([], {year: 'numeric', month: 'short', day: 'numeric'}) + 
         ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

/**
 * Дебаунс функции
 * @param {Function} func Функция для дебаунса
 * @param {number} delay Задержка в миллисекундах
 * @returns {Function} Дебаунс-функция
 */
function debounce(func, delay) {
  let inDebounce;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(() => func.apply(context, args), delay);
  };
}

/**
 * Троттлинг функции
 * @param {Function} func Функция для троттлинга
 * @param {number} limit Ограничение в миллисекундах
 * @returns {Function} Троттлинг-функция
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Загрузка изображения в Firebase Storage
 * @param {File} file Файл изображения
 * @param {string} path Путь в хранилище
 * @returns {Promise<string>} URL изображения
 */
function uploadImage(file, path) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Файл не указан'));
      return;
    }
    
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`${path}/${Date.now()}_${file.name}`);
    
    const uploadTask = fileRef.put(file);
    
    uploadTask.on('state_changed', 
      (snapshot) => {
        // Прогресс загрузки
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Загрузка: ${progress}%`);
      },
      (error) => {
        console.error('[Storage] Ошибка загрузки:', error);
        reject(error);
      },
      () => {
        // Завершение загрузки
        uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
          console.log('[Storage] Файл доступен по:', downloadURL);
          resolve(downloadURL);
        });
      }
    );
  });
}

/**
 * Загрузка аватара пользователя
 * @param {File} file Файл аватара
 * @returns {Promise<string>} URL аватара
 */
async function uploadUserAvatar(file) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Пользователь не авторизован');
    
    const downloadURL = await uploadImage(file, `avatars/${user.uid}`);
    
    // Обновление профиля пользователя
    await user.updateProfile({
      photoURL: downloadURL
    });
    
    // Обновление данных в Firestore
    await firestore.collection('users').doc(user.uid).update({
      avatar: downloadURL,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return downloadURL;
  } catch (error) {
    console.error('[Auth] Ошибка загрузки аватара:', error);
    throw error;
  }
}

// ======================================================
// 3. СИСТЕМА АВТОРИЗАЦИИ И ПОЛЬЗОВАТЕЛЬСКИЙ МЕНЕДЖМЕНТ
// ======================================================

/**
 * Класс для управления пользовательскими сессиями
 */
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authStateObserver = null;
    this.userLoaded = false;
    
    // Инициализация слушателя состояния аутентификации
    this.initAuthStateListener();
  }
  
  /**
   * Инициализация слушателя состояния аутентификации
   */
  initAuthStateListener() {
    this.authStateObserver = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log('[Auth] Пользователь авторизован:', user.uid);
        this.currentUser = user;
        
        try {
          // Загрузка дополнительных данных пользователя
          const userDoc = await firestore.collection('users').doc(user.uid).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            this.currentUser.displayName = userData.name || user.displayName;
            this.currentUser.photoURL = userData.avatar || user.photoURL;
            this.currentUser.settings = userData.settings || {};
            
            // Обновление профиля, если данные изменились
            if (userData.name && user.displayName !== userData.name) {
              await user.updateProfile({ displayName: userData.name });
            }
          } else {
            // Создание документа пользователя, если его нет
            await firestore.collection('users').doc(user.uid).set({
              name: user.displayName || 'Пользователь',
              email: user.email,
              avatar: user.photoURL || null,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              settings: {
                theme: 'light',
                notifications: true,
                language: 'ru'
              }
            });
            
            this.currentUser.displayName = user.displayName || 'Пользователь';
          }
          
          this.userLoaded = true;
          
          // Вызов обработчика успешной авторизации
          this.handleAuthSuccess();
        } catch (error) {
          console.error('[Firestore] Ошибка загрузки данных пользователя:', error);
          this.userLoaded = true;
          this.handleAuthSuccess();
        }
      } else {
        console.log('[Auth] Пользователь не авторизован');
        this.currentUser = null;
        this.userLoaded = true;
        
        // Вызов обработчика выхода из системы
        this.handleAuthSignOut();
      }
    });
  }
  
  /**
   * Обработчик успешной авторизации
   */
  handleAuthSuccess() {
    // Обновление интерфейса
    this.updateUIForAuthenticatedUser();
    
    // Проверка необходимости перенаправления
    const currentPath = window.location.pathname;
    if (currentPath === '/old_user.html' || currentPath === '/new_user.html') {
      setTimeout(() => {
        window.location.href = 'app.html';
      }, 500);
    }
  }
  
  /**
   * Обработчик выхода из системы
   */
  handleAuthSignOut() {
    // Обновление интерфейса
    this.updateUIForGuestUser();
    
    // Проверка необходимости перенаправления
    const currentPath = window.location.pathname;
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
      setTimeout(() => {
        window.location.href = 'old_user.html';
      }, 500);
    }
  }
  
  /**
   * Обновление интерфейса для авторизованного пользователя
   */
  updateUIForAuthenticatedUser() {
    // Обновление меню
    document.querySelectorAll('.menu-email').forEach(el => {
      el.textContent = this.currentUser.email;
    });
    
    document.querySelectorAll('.menu-title').forEach(el => {
      el.textContent = `${this.currentUser.displayName || 'Пользователь'} (GooglethApp)`;
    });
    
    // Обновление аватара
    const avatarUrl = this.currentUser.photoURL || 'https://placehold.co/100x100/e6e6e6/808080?text=U';
    document.querySelectorAll('.menu-avatar img, .profile-avatar-large img').forEach(img => {
      img.src = avatarUrl;
      img.style.display = 'block';
    });
    
    document.querySelectorAll('.menu-avatar').forEach(el => {
      el.classList.remove('pulse');
    });
    
    // Показываем элементы для авторизованных пользователей
    document.querySelectorAll('.auth-required').forEach(el => {
      el.style.display = 'block';
    });
    
    document.querySelectorAll('.guest-only').forEach(el => {
      el.style.display = 'none';
    });
  }
  
  /**
   * Обновление интерфейса для гостя
   */
  updateUIForGuestUser() {
    // Скрытие элементов для авторизованных пользователей
    document.querySelectorAll('.auth-required').forEach(el => {
      el.style.display = 'none';
    });
    
    document.querySelectorAll('.guest-only').forEach(el => {
      el.style.display = 'block';
    });
  }
  
  /**
   * Регистрация нового пользователя
   * @param {string} name Имя пользователя
   * @param {string} email Email пользователя
   * @param {string} password Пароль пользователя
   * @returns {Promise<Object>} Результат регистрации
   */
  async register(name, email, password) {
    try {
      // Проверка валидности email
      if (!isValidEmail(email)) {
        throw new Error('Неверный формат email');
      }
      
      // Проверка сложности пароля
      const strength = checkPasswordStrength(password);
      if (strength < 2) {
        throw new Error('Пароль слишком слабый. Используйте минимум 8 символов, включая заглавные буквы и цифры.');
      }
      
      // Регистрация через Firebase Auth
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        settings: {
          theme: 'light',
          notifications: true,
          language: 'ru'
        },
        status: 'online',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('[Auth] Регистрация успешна:', user.uid);
      return { success: true, user: user };
    } catch (error) {
      console.error('[Auth] Ошибка регистрации:', error);
      
      let message = 'Ошибка регистрации. Пожалуйста, попробуйте еще раз.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Этот email уже используется. Попробуйте войти.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Пароль слишком слабый. Используйте минимум 6 символов.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Неверный формат email.';
      }
      
      return { success: false, message: message };
    }
  }
  
  /**
   * Вход пользователя в систему
   * @param {string} email Email пользователя
   * @param {string} password Пароль пользователя
   * @returns {Promise<Object>} Результат входа
   */
  async login(email, password) {
    try {
      // Проверка валидности email
      if (!isValidEmail(email)) {
        throw new Error('Неверный формат email');
      }
      
      // Вход через Firebase Auth
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      console.log('[Auth] Вход успешен:', user.uid);
      
      // Обновление статуса пользователя
      await firestore.collection('users').doc(user.uid).update({
        status: 'online',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true, user: user };
    } catch (error) {
      console.error('[Auth] Ошибка входа:', error);
      
      let message = 'Ошибка входа. Пожалуйста, проверьте email и пароль.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Неверный email или пароль';
      } else if (error.code === 'auth/user-disabled') {
        message = 'Этот аккаунт был отключен. Обратитесь в поддержку.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Слишком много попыток входа. Попробуйте позже.';
      }
      
      return { success: false, message: message };
    }
  }
  
  /**
   * Вход через Google
   * @returns {Promise<Object>} Результат входа
   */
  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const userCredential = await auth.signInWithPopup(provider);
      const user = userCredential.user;
      
      console.log('[Auth] Вход через Google успешен:', user.uid);
      
      // Проверка существования документа пользователя
      const userDoc = await firestore.collection('users').doc(user.uid).get();
      
      if (!userDoc.exists) {
        // Создание документа пользователя, если его нет
        await firestore.collection('users').doc(user.uid).set({
          name: user.displayName,
          email: user.email,
          avatar: user.photoURL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          settings: {
            theme: 'light',
            notifications: true,
            language: 'ru'
          },
          status: 'online',
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Обновление существующего документа
        await firestore.collection('users').doc(user.uid).update({
          name: user.displayName,
          email: user.email,
          avatar: user.photoURL,
          status: 'online',
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      return { success: true, user: user };
    } catch (error) {
      console.error('[Auth] Ошибка входа через Google:', error);
      
      let message = 'Ошибка входа через Google. Пожалуйста, попробуйте еще раз.';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Окно авторизации закрыто. Пожалуйста, попробуйте снова.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = 'Запрос авторизации отменен. Пожалуйста, попробуйте снова.';
      }
      
      return { success: false, message: message };
    }
  }
  
  /**
   * Выход из системы
   */
  async logout() {
    try {
      const user = auth.currentUser;
      
      if (user) {
        // Обновление статуса пользователя
        await firestore.collection('users').doc(user.uid).update({
          status: 'offline',
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Выход из системы
      await auth.signOut();
      console.log('[Auth] Успешный выход из системы');
    } catch (error) {
      console.error('[Auth] Ошибка выхода из системы:', error);
      throw new Error('Не удалось выйти из системы');
    }
  }
  
  /**
   * Отправка письма для сброса пароля
   * @param {string} email Email пользователя
   * @returns {Promise<Object>} Результат отправки
   */
  async sendPasswordResetEmail(email) {
    try {
      // Проверка валидности email
      if (!isValidEmail(email)) {
        throw new Error('Неверный формат email');
      }
      
      await auth.sendPasswordResetEmail(email);
      console.log('[Auth] Письмо для сброса пароля отправлено:', email);
      return { success: true, message: 'Письмо для сброса пароля отправлено. Проверьте вашу почту.' };
    } catch (error) {
      console.error('[Auth] Ошибка отправки письма для сброса пароля:', error);
      
      let message = 'Ошибка отправки письма. Пожалуйста, попробуйте еще раз.';
      if (error.code === 'auth/user-not-found') {
        message = 'Пользователь с таким email не найден.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Неверный формат email.';
      }
      
      return { success: false, message: message };
    }
  }
  
  /**
   * Проверка существования email
   * @param {string} email Email для проверки
   * @returns {Promise<boolean>} Существует ли email
   */
  async checkEmailExists(email) {
    try {
      // Проверка валидности email
      if (!isValidEmail(email)) {
        return false;
      }
      
      const methods = await auth.fetchSignInMethodsForEmail(email);
      return methods.length > 0;
    } catch (error) {
      console.error('[Auth] Ошибка проверки email:', error);
      return false;
    }
  }
  
  /**
   * Обновление профиля пользователя
   * @param {Object} updates Объект с обновлениями
   * @returns {Promise<Object>} Результат обновления
   */
  async updateProfile(updates) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      const updatePromises = [];
      
      // Обновление профиля в Firebase Auth
      if (updates.name && updates.name !== user.displayName) {
        updatePromises.push(user.updateProfile({ displayName: updates.name }));
      }
      
      if (updates.email && updates.email !== user.email) {
        updatePromises.push(user.updateEmail(updates.email));
      }
      
      if (updates.photoURL && updates.photoURL !== user.photoURL) {
        updatePromises.push(user.updateProfile({ photoURL: updates.photoURL }));
      }
      
      // Обновление данных в Firestore
      const firestoreUpdates = {};
      if (updates.name) firestoreUpdates.name = updates.name;
      if (updates.email) firestoreUpdates.email = updates.email;
      if (updates.avatar) firestoreUpdates.avatar = updates.avatar;
      if (updates.settings) firestoreUpdates.settings = updates.settings;
      
      if (Object.keys(firestoreUpdates).length > 0) {
        firestoreUpdates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        updatePromises.push(
          firestore.collection('users').doc(user.uid).update(firestoreUpdates)
        );
      }
      
      await Promise.all(updatePromises);
      
      console.log('[Auth] Профиль обновлен успешно');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Ошибка обновления профиля:', error);
      
      let message = 'Ошибка обновления профиля. Пожалуйста, попробуйте еще раз.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Этот email уже используется другим аккаунтом.';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'Для изменения этой информации требуется повторный вход в систему.';
      }
      
      return { success: false, message: message };
    }
  }
  
  /**
   * Обновление пароля пользователя
   * @param {string} newPassword Новый пароль
   * @returns {Promise<Object>} Результат обновления
   */
  async updatePassword(newPassword) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      // Проверка сложности пароля
      const strength = checkPasswordStrength(newPassword);
      if (strength < 2) {
        throw new Error('Пароль слишком слабый. Используйте минимум 8 символов, включая заглавные буквы и цифры.');
      }
      
      // Обновление пароля
      await user.updatePassword(newPassword);
      
      console.log('[Auth] Пароль обновлен успешно');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Ошибка обновления пароля:', error);
      
      let message = 'Ошибка обновления пароля. Пожалуйста, попробуйте еще раз.';
      if (error.code === 'auth/weak-password') {
        message = 'Пароль слишком слабый. Используйте минимум 6 символов.';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'Для изменения пароля требуется повторный вход в систему.';
      }
      
      return { success: false, message: message };
    }
  }
}

// ======================================================
// 4. МЕНЕДЖЕР ГРУПП И ЧАТОВ
// ======================================================

/**
 * Класс для управления группами и чатами
 */
class ChatManager {
  constructor() {
    this.groups = [];
    this.chats = [];
    this.onlineUsers = [];
    this.currentChat = null;
    this.chatListeners = {};
    this.groupListeners = {};
    this.onlineUsersListener = null;
    
    // Инициализация
    this.init();
  }
  
  /**
   * Инициализация менеджера чатов
   */
  init() {
    // Проверка авторизации
    if (!auth.currentUser) {
      console.log('[Chat] Пользователь не авторизован, пропуск инициализации');
      return;
    }
    
    // Загрузка данных
    this.loadGroups();
    this.loadChats();
    this.setupOnlineUsersListener();
  }
  
  /**
   * Загрузка групп пользователя
   */
  loadGroups() {
    if (!auth.currentUser) return;
    
    const userId = auth.currentUser.uid;
    
    // Удаление предыдущего слушателя
    if (this.groupListeners[userId]) {
      this.groupListeners[userId]();
      delete this.groupListeners[userId];
    }
    
    // Создание нового слушателя
    this.groupListeners[userId] = firestore.collection('groups')
      .where('members', 'array-contains', userId)
      .onSnapshot(snapshot => {
        this.groups = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            lastMessage: data.lastMessage || null,
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
          };
        });
        
        // Сортировка по последнему сообщению
        this.groups.sort((a, b) => 
          (b.lastMessage?.timestamp?.toDate() || b.updatedAt) - 
          (a.lastMessage?.timestamp?.toDate() || a.updatedAt)
        );
        
        // Обновление интерфейса
        this.updateGroupsUI();
      }, error => {
        console.error('[Chat] Ошибка загрузки групп:', error);
      });
  }
  
  /**
   * Загрузка чатов пользователя
   */
  loadChats() {
    if (!auth.currentUser) return;
    
    const userId = auth.currentUser.uid;
    
    // Удаление предыдущего слушателя
    if (this.chatListeners[userId]) {
      this.chatListeners[userId]();
      delete this.chatListeners[userId];
    }
    
    // Создание нового слушателя
    this.chatListeners[userId] = firestore.collection('chats')
      .where('participants', 'array-contains', userId)
      .onSnapshot(snapshot => {
        this.chats = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            lastMessage: data.lastMessage || null,
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
          };
        });
        
        // Сортировка по последнему сообщению
        this.chats.sort((a, b) => 
          (b.lastMessage?.timestamp?.toDate() || b.updatedAt) - 
          (a.lastMessage?.timestamp?.toDate() || a.updatedAt)
        );
        
        // Обновление интерфейса
        this.updateChatsUI();
      }, error => {
        console.error('[Chat] Ошибка загрузки чатов:', error);
      });
  }
  
  /**
   * Настройка слушателя онлайн-пользователей
   */
  setupOnlineUsersListener() {
    if (this.onlineUsersListener) {
      this.onlineUsersListener();
    }
    
    this.onlineUsersListener = firestore.collection('users')
      .where('status', '==', 'online')
      .onSnapshot(snapshot => {
        this.onlineUsers = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            avatar: data.avatar,
            lastSeen: data.lastSeen ? data.lastSeen.toDate() : null
          };
        });
        
        // Обновление интерфейса
        this.updateOnlineUsersUI();
      }, error => {
        console.error('[Chat] Ошибка загрузки онлайн-пользователей:', error);
      });
  }
  
  /**
   * Обновление интерфейса групп
   */
  updateGroupsUI() {
    const groupsList = document.getElementById('groups-list');
    if (!groupsList) return;
    
    // Очистка списка
    groupsList.innerHTML = '';
    
    if (this.groups.length === 0) {
      groupsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <p>У вас пока нет групп</p>
          <button class="primary-btn" onclick="navigateTo('create-group.html')">Создать группу</button>
        </div>
      `;
      return;
    }
    
    // Добавление групп
    this.groups.forEach(group => {
      const groupElement = document.createElement('div');
      groupElement.className = 'group-item';
      groupElement.dataset.groupId = group.id;
      groupElement.innerHTML = `
        <div class="group-avatar" style="background: linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})">
          ${group.name.charAt(0).toUpperCase()}
        </div>
        <div class="group-info">
          <div class="group-name">${group.name}</div>
          <div class="group-members">${group.members.length} участников</div>
        </div>
      `;
      
      groupElement.addEventListener('click', () => {
        this.openGroupChat(group.id);
      });
      
      groupsList.appendChild(groupElement);
    });
  }
  
  /**
   * Обновление интерфейса чатов
   */
  updateChatsUI() {
    const chatsList = document.getElementById('chats-list');
    if (!chatsList) return;
    
    // Очистка списка
    chatsList.innerHTML = '';
    
    if (this.chats.length === 0) {
      chatsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <p>У вас пока нет чатов</p>
          <button class="primary-btn" onclick="navigateTo('new-chat.html')">Новый чат</button>
        </div>
      `;
      return;
    }
    
    // Добавление чатов
    this.chats.forEach(chat => {
      const chatElement = document.createElement('div');
      chatElement.className = 'chat-item';
      chatElement.dataset.chatId = chat.id;
      chatElement.innerHTML = `
        <div class="chat-avatar" style="background: linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})">
          ${chat.participants.length > 2 ? '👥' : chat.participants[0].charAt(0).toUpperCase()}
        </div>
        <div class="chat-info">
          <div class="chat-name">${chat.name || 'Чат'}</div>
          <div class="chat-status">${chat.lastMessage ? chat.lastMessage.text.substring(0, 30) + '...' : 'Нет сообщений'}</div>
        </div>
      `;
      
      chatElement.addEventListener('click', () => {
        this.openChat(chat.id);
      });
      
      chatsList.appendChild(chatElement);
    });
  }
  
  /**
   * Обновление интерфейса онлайн-пользователей
   */
  updateOnlineUsersUI() {
    const onlineUsersList = document.getElementById('online-users');
    if (!onlineUsersList) return;
    
    // Очистка списка
    onlineUsersList.innerHTML = '';
    
    if (this.onlineUsers.length === 0) {
      onlineUsersList.innerHTML = `
        <div class="no-online-users">
          <div class="empty-icon">👥</div>
          <p>Нет пользователей онлайн</p>
        </div>
      `;
      return;
    }
    
    // Добавление пользователей
    this.onlineUsers.forEach(user => {
      const userElement = document.createElement('div');
      userElement.className = 'online-user';
      userElement.dataset.userId = user.id;
      userElement.innerHTML = `
        <div class="online-avatar">
          <img src="${user.avatar || 'https://placehold.co/48x48/e6e6e6/808080?text=U'}" alt="${user.name}">
          <div class="online-status"></div>
        </div>
        <div class="online-info">
          <div class="online-name">${user.name}</div>
          <div class="online-status-text">Онлайн</div>
        </div>
      `;
      
      userElement.addEventListener('click', () => {
        this.startChatWithUser(user.id);
      });
      
      onlineUsersList.appendChild(userElement);
    });
  }
  
  /**
   * Открытие чата с пользователем
   * @param {string} userId ID пользователя
   */
  async startChatWithUser(userId) {
    if (!auth.currentUser) {
      window.showError('Пожалуйста, войдите в систему');
      return;
    }
    
    try {
      const currentUser = auth.currentUser;
      const chatId = [currentUser.uid, userId].sort().join('_');
      
      // Проверка существования чата
      const chatRef = firestore.collection('chats').doc(chatId);
      const chatDoc = await chatRef.get();
      
      if (chatDoc.exists) {
        // Чат существует, открываем его
        this.openChat(chatId);
      } else {
        // Создание нового чата
        const userDoc = await firestore.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        await chatRef.set({
          participants: [currentUser.uid, userId],
          name: userData.name,
          type: 'private',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessage: null
        });
        
        // Открытие чата
        this.openChat(chatId);
      }
    } catch (error) {
      console.error('[Chat] Ошибка начала чата:', error);
      window.showError('Не удалось начать чат. Пожалуйста, попробуйте еще раз.');
    }
  }
  
  /**
   * Открытие чата
   * @param {string} chatId ID чата
   */
  openChat(chatId) {
    this.currentChat = chatId;
    window.navigateTo(`p2p-chat.html?chatId=${chatId}`);
  }
  
  /**
   * Открытие группы
   * @param {string} groupId ID группы
   */
  openGroupChat(groupId) {
    this.currentChat = groupId;
    window.navigateTo(`p2p-chat.html?groupId=${groupId}`);
  }
  
  /**
   * Создание новой группы
   * @param {Object} groupData Данные группы
   * @returns {Promise<Object>} Результат создания
   */
  async createGroup(groupData) {
    if (!auth.currentUser) {
      return { success: false, message: 'Пожалуйста, войдите в систему' };
    }
    
    try {
      const currentUser = auth.currentUser;
      
      // Создание документа группы
      const groupRef = await firestore.collection('groups').add({
        name: groupData.name,
        description: groupData.description || '',
        creator: currentUser.uid,
        members: [currentUser.uid, ...groupData.members],
        avatar: groupData.avatar || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        settings: {
          allowNonMembersToMessage: true,
          requireApproval: false
        }
      });
      
      // Создание чата для группы
      await firestore.collection('chats').doc(groupRef.id).set({
        participants: [currentUser.uid, ...groupData.members],
        name: groupData.name,
        type: 'group',
        groupId: groupRef.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessage: null
      });
      
      console.log('[Chat] Группа создана успешно:', groupRef.id);
      return { success: true, groupId: groupRef.id };
    } catch (error) {
      console.error('[Chat] Ошибка создания группы:', error);
      return { success: false, message: 'Не удалось создать группу. Пожалуйста, попробуйте еще раз.' };
    }
  }
  
  /**
   * Отправка сообщения
   * @param {string} chatId ID чата
   * @param {Object} messageData Данные сообщения
   * @returns {Promise<Object>} Результат отправки
   */
  async sendMessage(chatId, messageData) {
    if (!auth.currentUser) {
      return { success: false, message: 'Пожалуйста, войдите в систему' };
    }
    
    try {
      const currentUser = auth.currentUser;
      
      // Создание документа сообщения
      const messageRef = await firestore.collection('messages').add({
        chatId: chatId,
        senderId: currentUser.uid,
        text: messageData.text,
        media: messageData.media || null,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        readBy: [currentUser.uid],
        status: 'sent'
      });
      
      // Обновление последнего сообщения в чате
      await firestore.collection('chats').doc(chatId).update({
        lastMessage: {
          id: messageRef.id,
          text: messageData.text.substring(0, 50) + (messageData.text.length > 50 ? '...' : ''),
          senderId: currentUser.uid,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Если это группа, обновляем и группу
      if (chatId.startsWith('group_')) {
        await firestore.collection('groups').doc(chatId).update({
          lastMessage: {
            id: messageRef.id,
            text: messageData.text.substring(0, 50) + (messageData.text.length > 50 ? '...' : ''),
            senderId: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          },
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      console.log('[Chat] Сообщение отправлено успешно:', messageRef.id);
      return { success: true, messageId: messageRef.id };
    } catch (error) {
      console.error('[Chat] Ошибка отправки сообщения:', error);
      return { success: false, message: 'Не удалось отправить сообщение. Пожалуйста, попробуйте еще раз.' };
    }
  }
  
  /**
   * Загрузка сообщений чата
   * @param {string} chatId ID чата
   * @param {number} limit Лимит сообщений
   * @returns {Promise<Array>} Список сообщений
   */
  async loadMessages(chatId, limit = 50) {
    try {
      const messagesSnapshot = await firestore.collection('messages')
        .where('chatId', '==', chatId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      const messages = messagesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
        };
      }).reverse();
      
      return messages;
    } catch (error) {
      console.error('[Chat] Ошибка загрузки сообщений:', error);
      throw new Error('Не удалось загрузить сообщения');
    }
  }
  
  /**
   * Пометить сообщения как прочитанные
   * @param {string} chatId ID чата
   * @param {Array<string>} messageIds ID сообщений
   */
  async markMessagesAsRead(chatId, messageIds) {
    if (!auth.currentUser || !messageIds.length) return;
    
    const batch = firestore.batch();
    const userId = auth.currentUser.uid;
    
    messageIds.forEach(messageId => {
      const messageRef = firestore.collection('messages').doc(messageId);
      batch.update(messageRef, {
        readBy: firebase.firestore.FieldValue.arrayUnion(userId)
      });
    });
    
    await batch.commit();
  }
  
  /**
   * Поиск пользователей
   * @param {string} query Запрос для поиска
   * @returns {Promise<Array>} Список пользователей
   */
  async searchUsers(query) {
    if (!query || query.length < 2) return [];
    
    try {
      const usersSnapshot = await firestore.collection('users')
        .where('name', '>=', query)
        .where('name', '<=', query + '\uf8ff')
        .limit(20)
        .get();
      
      return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          email: data.email,
          avatar: data.avatar,
          status: data.status
        };
      });
    } catch (error) {
      console.error('[Chat] Ошибка поиска пользователей:', error);
      return [];
    }
  }
  
  /**
   * Очистка ресурсов
   */
  cleanup() {
    // Удаление слушателей
    Object.values(this.chatListeners).forEach(unsubscribe => unsubscribe());
    Object.values(this.groupListeners).forEach(unsubscribe => unsubscribe());
    
    if (this.onlineUsersListener) {
      this.onlineUsersListener();
    }
    
    this.chatListeners = {};
    this.groupListeners = {};
    this.onlineUsersListener = null;
  }
}

// ======================================================
// 5. ГЛОБАЛЬНЫЕ ФУНКЦИИ И ОБРАБОТЧИКИ
// ======================================================

// Инициализация менеджеров
const authManager = new AuthManager();
const chatManager = new ChatManager();

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

// Добавляем функции в глобальный контекст
window.navigateTo = navigateTo;
window.showError = showError;
window.showSuccess = showSuccess;
window.authManager = authManager;
window.chatManager = chatManager;

// ======================================================
// 6. ОБРАБОТЧИКИ СОБЫТИЙ ДЛЯ СТРАНИЦ
// ======================================================

/**
 * Обработчики для страницы регистрации (new_user.html)
 */
function setupRegistrationPage() {
  // Проверка, находимся ли мы на странице регистрации
  if (!window.location.pathname.endsWith('new_user.html')) {
    return;
  }
  
  console.log('[Page] Инициализация страницы регистрации');
  
  // Обработчик регистрации
  document.getElementById('signup-btn').addEventListener('click', async () => {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    
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
    
    // Проверка существования email
    const emailExists = await authManager.checkEmailExists(email);
    if (emailExists) {
      window.showError('Этот email уже используется');
      return;
    }
    
    // Регистрация пользователя
    const result = await authManager.register(name, email, password);
    
    if (result.success) {
      window.showSuccess('Регистрация успешна! Добро пожаловать в GooglthApp');
      setTimeout(() => {
        window.navigateTo('app.html');
      }, 1500);
    } else {
      window.showError(result.message);
    }
  });
  
  // Обработчик Google входа
  document.getElementById('google-signup').addEventListener('click', async () => {
    const result = await authManager.loginWithGoogle();
    
    if (result.success) {
      window.showSuccess('Вход через Google успешен!');
      setTimeout(() => {
        window.navigateTo('app.html');
      }, 1500);
    } else {
      window.showError(result.message);
    }
  });
  
  // Обработчик входа через email
  document.getElementById('email-signup').addEventListener('click', () => {
    window.navigateTo('old_user.html');
  });
  
  // Проверка email
  document.getElementById('signup-email').addEventListener('blur', async () => {
    const email = document.getElementById('signup-email').value;
    const statusEl = document.getElementById('email-status');
    
    if (!email) {
      statusEl.textContent = '';
      statusEl.style.color = '';
      return;
    }
    
    const emailExists = await authManager.checkEmailExists(email);
    
    if (emailExists) {
      statusEl.textContent = 'Этот email уже используется';
      statusEl.style.color = '#ea4335';
    } else {
      statusEl.textContent = 'Email доступен';
      statusEl.style.color = '#34a853';
    }
  });
  
  // Проверка пароля
  document.getElementById('signup-password').addEventListener('input', () => {
    const password = document.getElementById('signup-password').value;
    const strengthEl = document.getElementById('password-strength');
    
    if (!password) {
      strengthEl.textContent = '';
      return;
    }
    
    const strength = checkPasswordStrength(password);
    
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
  });
  
  // Проверка подтверждения пароля
  document.getElementById('signup-confirm').addEventListener('input', () => {
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const matchEl = document.getElementById('password-match');
    
    if (!confirm) {
      matchEl.textContent = '';
      return;
    }
    
    if (password === confirm) {
      matchEl.textContent = 'Пароли совпадают';
      matchEl.style.color = '#34a853';
    } else {
      matchEl.textContent = 'Пароли не совпадают';
      matchEl.style.color = '#ea4335';
    }
  });
}

/**
 * Обработчики для страницы входа (old_user.html)
 */
function setupLoginPage() {
  // Проверка, находимся ли мы на странице входа
  if (!window.location.pathname.endsWith('old_user.html')) {
    return;
  }
  
  console.log('[Page] Инициализация страницы входа');
  
  // Обработчик входа
  document.getElementById('login-btn').addEventListener('click', async () => {
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    
    if (!identifier || !password) {
      window.showError('Пожалуйста, заполните все поля');
      return;
    }
    
    // Вход пользователя
    const result = await authManager.login(identifier, password);
    
    if (result.success) {
      window.showSuccess('Успешный вход! Добро пожаловать в GooglthApp');
      setTimeout(() => {
        window.navigateTo('app.html');
      }, 1000);
    } else {
      window.showError(result.message);
    }
  });
  
  // Обработчик Google входа
  document.getElementById('google-login').addEventListener('click', async () => {
    const result = await authManager.loginWithGoogle();
    
    if (result.success) {
      window.showSuccess('Вход через Google успешен!');
      setTimeout(() => {
        window.navigateTo('app.html');
      }, 1500);
    } else {
      window.showError(result.message);
    }
  });
  
  // Обработчик сброса пароля
  document.getElementById('forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    
    const identifier = document.getElementById('login-identifier').value;
    if (!identifier) {
      window.showError('Пожалуйста, введите email');
      return;
    }
    
    authManager.sendPasswordResetEmail(identifier)
      .then(result => {
        if (result.success) {
          window.showSuccess(result.message);
        } else {
          window.showError(result.message);
        }
      });
  });
  
  // Проверка email
  document.getElementById('login-identifier').addEventListener('blur', async () => {
    const email = document.getElementById('login-identifier').value;
    const statusEl = document.getElementById('email-status');
    
    if (!email) {
      statusEl.textContent = '';
      statusEl.style.color = '';
      return;
    }
    
    const emailExists = await authManager.checkEmailExists(email);
    
    if (emailExists) {
      statusEl.textContent = 'Аккаунт найден';
      statusEl.style.color = '#34a853';
    } else {
      statusEl.textContent = 'Email не найден';
      statusEl.style.color = '#ea4335';
    }
  });
}

/**
 * Обработчики для главной страницы (app.html)
 */
function setupAppPage() {
  // Проверка, находимся ли мы на главной странице
  if (!window.location.pathname.endsWith('app.html')) {
    return;
  }
  
  console.log('[Page] Инициализация главной страницы');
  
  // Обработчик создания группы
  const createGroupBtn = document.getElementById('create-group-btn');
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', () => {
      window.navigateTo('create-group.html');
    });
  }
  
  // Обработчик поиска контактов
  const findContactsBtn = document.querySelector('.action-btn:nth-child(2)');
  if (findContactsBtn) {
    findContactsBtn.addEventListener('click', () => {
      window.navigateTo('find-contacts.html');
    });
  }
  
  // Обработчик нового чата
  const newChatBtn = document.querySelector('.action-btn:nth-child(3)');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      window.navigateTo('new-chat.html');
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
  
  // Обработчик выхода
  function handleLogout() {
    authManager.logout()
      .then(() => {
        window.showSuccess('Вы успешно вышли из аккаунта');
        setTimeout(() => {
          window.navigateTo('old_user.html');
        }, 1500);
      })
      .catch(error => {
        window.showError('Ошибка выхода из системы: ' + error.message);
      });
  }
  
  window.handleLogout = handleLogout;
  
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

/**
 * Обработчики для страницы создания группы (create-group.html)
 */
function setupCreateGroupPage() {
  // Проверка, находимся ли мы на странице создания группы
  if (!window.location.pathname.endsWith('create-group.html')) {
    return;
  }
  
  console.log('[Page] Инициализация страницы создания группы');
  
  // Обработчик выбора аватара
  document.getElementById('group-avatar').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById('group-avatar-preview');
    const reader = new FileReader();
    
    reader.onload = function(e) {
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    
    reader.readAsDataURL(file);
  });
  
  // Обработчик поиска участников
  const searchInput = document.getElementById('member-search');
  if (searchInput) {
    const debouncedSearch = debounce(async (query) => {
      if (query.length < 2) {
        document.getElementById('members-list').innerHTML = `
          <div class="no-members">
            <div class="empty-icon">👥</div>
            <p>Добавьте участников в группу</p>
          </div>
        `;
        return;
      }
      
      const users = await chatManager.searchUsers(query);
      
      if (users.length === 0) {
        document.getElementById('members-list').innerHTML = `
          <div class="no-members">
            <div class="empty-icon">🔍</div>
            <p>Пользователи не найдены</p>
          </div>
        `;
        return;
      }
      
      let html = '';
      users.forEach(user => {
        html += `
          <div class="group-item" data-user-id="${user.id}">
            <div class="group-avatar" style="background: linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})">
              ${user.name.charAt(0).toUpperCase()}
            </div>
            <div class="group-info">
              <div class="group-name">${user.name}</div>
              <div class="group-members">${user.status === 'online' ? 'Онлайн' : 'Офлайн'}</div>
            </div>
          </div>
        `;
      });
      
      document.getElementById('members-list').innerHTML = html;
      
      // Добавление обработчиков для участников
      document.querySelectorAll('.group-item').forEach(item => {
        item.addEventListener('click', function() {
          const userId = this.dataset.userId;
          const selected = this.classList.toggle('selected');
          
          if (selected) {
            this.style.backgroundColor = '#f1f3f4';
          } else {
            this.style.backgroundColor = '';
          }
        });
      });
    }, 300);
    
    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  }
  
  // Обработчик создания группы
  document.getElementById('create-group-btn').addEventListener('click', async () => {
    const name = document.getElementById('group-name').value;
    const description = document.getElementById('group-description').value;
    
    if (!name) {
      window.showError('Пожалуйста, введите название группы');
      return;
    }
    
    // Получение выбранных участников
    const selectedUsers = [];
    document.querySelectorAll('.group-item.selected').forEach(item => {
      selectedUsers.push(item.dataset.userId);
    });
    
    // Добавление текущего пользователя
    if (auth.currentUser) {
      selectedUsers.push(auth.currentUser.uid);
    }
    
    // Создание группы
    const result = await chatManager.createGroup({
      name: name,
      description: description,
      members: selectedUsers,
      avatar: document.getElementById('group-avatar-preview').src
    });
    
    if (result.success) {
      window.showSuccess('Группа успешно создана!');
      setTimeout(() => {
        window.navigateTo('app.html');
      }, 1500);
    } else {
      window.showError(result.message);
    }
  });
  
  // Заполнение начального списка участников
  (async () => {
    const users = await chatManager.searchUsers('');
    
    if (users.length === 0) {
      document.getElementById('members-list').innerHTML = `
        <div class="no-members">
          <div class="empty-icon">👥</div>
          <p>Добавьте участников в группу</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    users.forEach(user => {
      html += `
        <div class="group-item" data-user-id="${user.id}">
          <div class="group-avatar" style="background: linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})">
            ${user.name.charAt(0).toUpperCase()}
          </div>
          <div class="group-info">
            <div class="group-name">${user.name}</div>
            <div class="group-members">${user.status === 'online' ? 'Онлайн' : 'Офлайн'}</div>
          </div>
        </div>
      `;
    });
    
    document.getElementById('members-list').innerHTML = html;
    
    // Добавление обработчиков для участников
    document.querySelectorAll('.group-item').forEach(item => {
      item.addEventListener('click', function() {
        const userId = this.dataset.userId;
        const selected = this.classList.toggle('selected');
        
        if (selected) {
          this.style.backgroundColor = '#f1f3f4';
        } else {
          this.style.backgroundColor = '';
        }
      });
    });
  })();
}

/**
 * Обработчики для страницы поиска контактов (find-contacts.html)
 */
function setupFindContactsPage() {
  // Проверка, находимся ли мы на странице поиска контактов
  if (!window.location.pathname.endsWith('find-contacts.html')) {
    return;
  }
  
  console.log('[Page] Инициализация страницы поиска контактов');
  
  // Обработчик поиска
  const searchInput = document.getElementById('contact-search');
  if (searchInput) {
    const debouncedSearch = debounce(async (query) => {
      if (query.length < 2) {
        document.getElementById('contacts-list').innerHTML = `
          <div class="no-results">
            <div class="empty-icon">🔍</div>
            <p>Введите запрос для поиска</p>
          </div>
        `;
        return;
      }
      
      const users = await chatManager.searchUsers(query);
      
      if (users.length === 0) {
        document.getElementById('contacts-list').innerHTML = `
          <div class="no-results">
            <div class="empty-icon">🔍</div>
            <p>Пользователи не найдены</p>
          </div>
        `;
        return;
      }
      
      let html = '';
      users.forEach(user => {
        html += `
          <div class="contact-item" data-user-id="${user.id}">
            <div class="contact-avatar" style="background: linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})">
              ${user.name.charAt(0).toUpperCase()}
            </div>
            <div class="contact-info">
              <div class="contact-name">${user.name}</div>
              <div class="contact-email">${user.email}</div>
            </div>
            <button class="add-contact-btn" onclick="chatManager.startChatWithUser('${user.id}')">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM10 17l5.5-5.5-1.4-1.42-4 4zm7.5-9.5l-1-1h-5v5h5V8z"/>
              </svg>
            </button>
          </div>
        `;
      });
      
      document.getElementById('contacts-list').innerHTML = html;
    }, 300);
    
    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  }
  
  // Заполнение начального списка
  (async () => {
    const users = await chatManager.searchUsers('');
    
    if (users.length === 0) {
      document.getElementById('contacts-list').innerHTML = `
        <div class="no-results">
          <div class="empty-icon">👥</div>
          <p>Пользователи не найдены</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    users.forEach(user => {
      html += `
        <div class="contact-item" data-user-id="${user.id}">
          <div class="contact-avatar" style="background: linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})">
            ${user.name.charAt(0).toUpperCase()}
          </div>
          <div class="contact-info">
            <div class="contact-name">${user.name}</div>
            <div class="contact-email">${user.email}</div>
          </div>
          <button class="add-contact-btn" onclick="chatManager.startChatWithUser('${user.id}')">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM10 17l5.5-5.5-1.4-1.42-4 4zm7.5-9.5l-1-1h-5v5h5V8z"/>
            </svg>
          </button>
        </div>
      `;
    });
    
    document.getElementById('contacts-list').innerHTML = html;
  })();
}

/**
 * Обработчики для страницы чата (p2p-chat.html)
 */
function setupChatPage() {
  // Проверка, находимся ли мы на странице чата
  if (!window.location.pathname.endsWith('p2p-chat.html')) {
    return;
  }
  
  console.log('[Page] Инициализация страницы чата');
  
  // Получение ID чата из URL
  const urlParams = new URLSearchParams(window.location.search);
  const chatId = urlParams.get('chatId') || urlParams.get('groupId');
  
  if (!chatId) {
    window.showError('Чат не найден');
    setTimeout(() => {
      window.navigateTo('app.html');
    }, 2000);
    return;
  }
  
  // Загрузка сообщений
  let messages = [];
  let loading = false;
  
  async function loadChatMessages() {
    if (loading) return;
    loading = true;
    
    try {
      messages = await chatManager.loadMessages(chatId);
      renderMessages();
      
      // Прокрутка к последнему сообщению
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    } catch (error) {
      window.showError('Не удалось загрузить сообщения');
    } finally {
      loading = false;
    }
  }
  
  // Отображение сообщений
  function renderMessages() {
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="no-messages">
          <div class="empty-icon">💬</div>
          <p>Нет сообщений</p>
          <p>Напишите первое сообщение!</p>
        </div>
      `;
      return;
    }
    
    messages.forEach(message => {
      const isCurrentUser = message.senderId === auth.currentUser.uid;
      const messageElement = document.createElement('div');
      messageElement.className = `message ${isCurrentUser ? 'message-sent' : 'message-received'}`;
      
      let mediaHtml = '';
      if (message.media) {
        if (message.media.type.startsWith('image/')) {
          mediaHtml = `<img src="${message.media.url}" style="max-width: 200px; border-radius: 8px; margin-top: 8px;">`;
        } else if (message.media.type.startsWith('video/')) {
          mediaHtml = `<video src="${message.media.url}" controls style="max-width: 200px; border-radius: 8px; margin-top: 8px;"></video>`;
        }
      }
      
      messageElement.innerHTML = `
        <div class="message-content">${message.text}</div>
        ${mediaHtml}
        <div class="message-time">${formatDate(message.timestamp)}</div>
      `;
      
      messagesContainer.appendChild(messageElement);
    });
    
    // Прокрутка к последнему сообщению
    setTimeout(() => {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }
  
  // Отправка сообщения
  document.getElementById('send-message-btn').addEventListener('click', async () => {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Отправка сообщения
    const result = await chatManager.sendMessage(chatId, { text: text });
    
    if (result.success) {
      input.value = '';
    } else {
      window.showError('Не удалось отправить сообщение');
    }
  });
  
  // Отправка по нажатию Enter
  document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('send-message-btn').click();
    }
  });
  
  // Загрузка чата
  loadChatMessages();
  
  // Установка слушателя для новых сообщений
  const messagesListener = firestore.collection('messages')
    .where('chatId', '==', chatId)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const message = {
            id: change.doc.id,
            ...change.doc.data(),
            timestamp: change.doc.data().timestamp.toDate()
          };
          
          // Добавление сообщения в список
          messages.push(message);
          renderMessages();
          
          // Пометка сообщения как прочитанного
          chatManager.markMessagesAsRead(chatId, [message.id]);
        }
      });
    });
  
  // Очистка при уходе со страницы
  window.addEventListener('beforeunload', () => {
    if (messagesListener) {
      messagesListener();
    }
  });
}

/**
 * Обработчики для страницы профиля (profile.html)
 */
function setupProfilePage() {
  // Проверка, находимся ли мы на странице профиля
  if (!window.location.pathname.endsWith('profile.html')) {
    return;
  }
  
  console.log('[Page] Инициализация страницы профиля');
  
  // Загрузка данных профиля
  async function loadProfile() {
    if (!auth.currentUser) {
      window.showError('Пожалуйста, войдите в систему');
      setTimeout(() => {
        window.navigateTo('old_user.html');
      }, 2000);
      return;
    }
    
    const user = auth.currentUser;
    
    // Обновление интерфейса
    document.querySelector('.profile-hero h2').textContent = user.displayName || 'Пользователь';
    document.querySelector('.info-value.name').textContent = user.displayName || 'Пользователь';
    document.querySelector('.info-value.email').textContent = user.email || '';
    
    // Установка аватара
    const avatarUrl = user.photoURL || 'https://placehold.co/100x100/e6e6e6/808080?text=U';
    document.querySelectorAll('.profile-avatar-large img').forEach(img => {
      img.src = avatarUrl;
      img.style.display = 'block';
    });
  }
  
  // Обработчик изменения аватара
  document.getElementById('change-avatar-btn').addEventListener('click', () => {
    document.getElementById('avatar-upload').click();
  });
  
  // Обработчик загрузки аватара
  document.getElementById('avatar-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Показываем индикатор загрузки
      const uploadBtn = document.getElementById('change-avatar-btn');
      const originalText = uploadBtn.textContent;
      uploadBtn.textContent = 'Загрузка...';
      uploadBtn.disabled = true;
      
      // Загрузка аватара
      const downloadURL = await uploadUserAvatar(file);
      
      // Обновление интерфейса
      document.querySelectorAll('.profile-avatar-large img').forEach(img => {
        img.src = downloadURL;
      });
      
      // Сброс индикатора загрузки
      uploadBtn.textContent = originalText;
      uploadBtn.disabled = false;
      
      window.showSuccess('Аватар успешно обновлен');
    } catch (error) {
      console.error('[Profile] Ошибка загрузки аватара:', error);
      window.showError('Не удалось загрузить аватар. Пожалуйста, попробуйте еще раз.');
      
      // Сброс индикатора загрузки
      const uploadBtn = document.getElementById('change-avatar-btn');
      uploadBtn.textContent = 'Изменить фото';
      uploadBtn.disabled = false;
    }
  });
  
  // Обработчик изменения пароля
  document.getElementById('change-password-btn').addEventListener('click', async () => {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      window.showError('Пожалуйста, заполните все поля');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      window.showError('Новые пароли не совпадают');
      return;
    }
    
    // Здесь должен быть код для изменения пароля через Firebase
    // Для примера, мы просто вызываем метод менеджера
    const result = await authManager.updatePassword(newPassword);
    
    if (result.success) {
      window.showSuccess('Пароль успешно изменен');
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-password').value = '';
    } else {
      window.showError(result.message);
    }
  });
  
  // Загрузка профиля
  loadProfile();
}

// ======================================================
// 7. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ======================================================

/**
 * Инициализация приложения
 */
function initApp() {
  console.log('[App] Инициализация приложения');
  
  // Проверка поддержки браузера
  if (!isBrowserSupported()) {
    showBrowserNotSupported();
    return;
  }
  
  // Инициализация страниц
  setupRegistrationPage();
  setupLoginPage();
  setupAppPage();
  setupCreateGroupPage();
  setupFindContactsPage();
  setupChatPage();
  setupProfilePage();
  
  // Проверка авторизации
  checkAuthState();
  
  // Инициализация систем
  initSystems();
  
  // Инициализация UI
  initUI();
  
  console.log('[App] Инициализация завершена');
}

/**
 * Проверка поддержки браузера
 * @returns {boolean} Поддерживается ли браузер
 */
function isBrowserSupported() {
  // Проверка поддержки необходимых API
  return (
    typeof Promise !== 'undefined' &&
    typeof window.fetch !== 'undefined' &&
    typeof window.localStorage !== 'undefined' &&
    typeof window.document !== 'undefined'
  );
}

/**
 * Показать сообщение о неподдерживаемом браузере
 */
function showBrowserNotSupported() {
  document.body.innerHTML = `
    <div style="font-family: 'Google Sans', sans-serif; padding: 20px; text-align: center; color: #ea4335;">
      <h2>Браузер не поддерживается</h2>
      <p>Для корректной работы приложения требуется современный браузер с поддержкой современных веб-технологий.</p>
      <p>Пожалуйста, обновите ваш браузер или используйте один из следующих:</p>
      <ul style="list-style: none; padding: 0; margin: 20px 0;">
        <li style="margin: 10px 0;">Google Chrome (рекомендуется)</li>
        <li style="margin: 10px 0;">Mozilla Firefox</li>
        <li style="margin: 10px 0;">Microsoft Edge</li>
        <li style="margin: 10px 0;">Safari (версия 12 и выше)</li>
      </ul>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Проверить снова
      </button>
    </div>
  `;
}

/**
 * Проверка состояния авторизации
 */
function checkAuthState() {
  const currentPath = window.location.pathname;
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
    if (!auth.currentUser) {
      console.log('[Auth] Пользователь не авторизован, перенаправление на страницу входа');
      setTimeout(() => {
        window.navigateTo('old_user.html');
      }, 500);
    }
  }
}

/**
 * Инициализация систем
 */
function initSystems() {
  // Инициализация систем
  console.log('[System] Инициализация систем');
}

/**
 * Инициализация UI
 */
function initUI() {
  // Инициализация UI
  console.log('[UI] Инициализация интерфейса');
  
  // Инициализация анимаций
  initAnimations();
  
  // Инициализация скроллинга
  initScrolling();
}

/**
 * Инициализация анимаций
 */
function initAnimations() {
  // Анимация появления
  setTimeout(() => {
    document.body.classList.add('fade-in');
  }, 100);
}

/**
 * Инициализация скроллинга
 */
function initScrolling() {
  // Инициализация скроллинга для списков
  const scrollableLists = document.querySelectorAll('.scrollable-list');
  scrollableLists.forEach(list => {
    list.addEventListener('touchstart', function(e) {
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
      this.scrollStartX = this.scrollLeft;
      this.scrollStartY = this.scrollTop;
      this.touchStartTime = Date.now();
      this.isScrolling = false;
    }, { passive: true });
    
    list.addEventListener('touchmove', function(e) {
      if (!this.startX || !this.startY) return;
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const diffX = this.startX - touchX;
      const diffY = this.startY - touchY;
      
      // Определение направления скролла
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Горизонтальный скролл
        this.scrollLeft = this.scrollStartX + diffX;
        e.preventDefault();
      } else {
        // Вертикальный скролл
        this.scrollTop = this.scrollStartY + diffY;
      }
      
      this.isScrolling = true;
    }, { passive: false });
    
    list.addEventListener('touchend', function(e) {
      // Сброс переменных
      this.startX = null;
      this.startY = null;
    }, { passive: true });
  });
}

// ======================================================
// 8. ОБРАБОТЧИКИ ГЛОБАЛЬНЫХ СОБЫТИЙ
// ======================================================

// Обработчик изменения темы
document.addEventListener('DOMContentLoaded', () => {
  const themeOptions = document.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Удаление активного класса
      themeOptions.forEach(opt => opt.classList.remove('active'));
      
      // Добавление активного класса
      option.classList.add('active');
      
      // Установка темы
      const theme = option.classList.contains('theme-light') ? 'light' :
                   option.classList.contains('theme-dark') ? 'dark' : 'blue';
      
      // Сохранение темы в настройках
      if (authManager.currentUser) {
        authManager.updateProfile({
          settings: {
            ...authManager.currentUser.settings,
            theme: theme
          }
        });
      }
      
      // Обновление интерфейса
      document.documentElement.setAttribute('data-theme', theme);
    });
  });
  
  // Обработчик изменения фона чата
  const backgroundOptions = document.querySelectorAll('.background-option');
  backgroundOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Удаление активного класса
      backgroundOptions.forEach(opt => opt.classList.remove('active'));
      
      // Добавление активного класса
      option.classList.add('active');
      
      // Установка фона
      const background = option.classList[1];
      document.body.setAttribute('data-chat-background', background);
      
      // Сохранение фона в настройках
      if (authManager.currentUser) {
        authManager.updateProfile({
          settings: {
            ...authManager.currentUser.settings,
            chatBackground: background
          }
        });
      }
    });
  });
});

// Обработчик онлайн-статуса
window.addEventListener('online', () => {
  console.log('[Network] Подключение к интернету восстановлено');
  if (auth.currentUser) {
    firestore.collection('users').doc(auth.currentUser.uid).update({
      status: 'online',
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
});

window.addEventListener('offline', () => {
  console.log('[Network] Потеряно подключение к интернету');
  if (auth.currentUser) {
    firestore.collection('users').doc(auth.currentUser.uid).update({
      status: 'offline',
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
});

// Обработчик видимости страницы
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('[Page] Страница видима');
    if (auth.currentUser) {
      firestore.collection('users').doc(auth.currentUser.uid).update({
        status: 'online',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } else {
    console.log('[Page] Страница не видима');
    if (auth.currentUser) {
      firestore.collection('users').doc(auth.currentUser.uid).update({
        status: 'away',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }
});

// Обработчик ошибок
window.addEventListener('error', (event) => {
  console.error('[Error] Глобальная ошибка:', event);
  // Здесь можно отправить ошибку в систему мониторинга
});

// Обработчик необработанных промисов
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Error] Необработанное обещание:', event);
  event.preventDefault();
});

// ======================================================
// 9. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Init] DOM загружен');
  
  // Инициализация приложения
  initApp();
  
  // Добавление класса для анимации
  setTimeout(() => {
    document.body.classList.add('loaded');
  }, 100);
});

// ======================================================
// 10. ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ И СЕРВИСЫ
// ======================================================

/**
 * Сервис для работы с уведомлениями
 */
class NotificationService {
  constructor() {
    this.permission = 'default';
    this.supported = 'Notification' in window;
    
    if (this.supported) {
      this.permission = Notification.permission;
    }
  }
  
  /**
   * Запрос разрешения на уведомления
   * @returns {Promise<string>} Статус разрешения
   */
  requestPermission() {
    return new Promise((resolve, reject) => {
      if (!this.supported) {
        reject(new Error('Уведомления не поддерживаются в этом браузере'));
        return;
      }
      
      if (this.permission === 'granted') {
        resolve('granted');
        return;
      }
      
      if (this.permission === 'denied') {
        reject(new Error('Разрешение на уведомления отклонено'));
        return;
      }
      
      Notification.requestPermission().then(permission => {
        this.permission = permission;
        if (permission === 'granted') {
          resolve('granted');
        } else {
          reject(new Error('Разрешение на уведомления отклонено'));
        }
      });
    });
  }
  
  /**
   * Отправка уведомления
   * @param {string} title Заголовок уведомления
   * @param {Object} options Опции уведомления
   * @returns {Notification} Объект уведомления
   */
  sendNotification(title, options = {}) {
    if (!this.supported || this.permission !== 'granted') {
      return null;
    }
    
    // Добавление иконки по умолчанию
    if (!options.icon) {
      options.icon = '/favicon.ico';
    }
    
    const notification = new Notification(title, options);
    
    // Обработчик клика по уведомлению
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    return notification;
  }
  
  /**
   * Отправка уведомления о новом сообщении
   * @param {Object} message Данные сообщения
   * @param {Object} sender Данные отправителя
   */
  sendNewMessageNotification(message, sender) {
    if (!this.supported || this.permission !== 'granted') {
      return;
    }
    
    this.sendNotification(sender.name, {
      body: message.text.substring(0, 50) + (message.text.length > 50 ? '...' : ''),
      icon: sender.avatar || '/favicon.ico',
      tag: `message-${message.id}`
    });
  }
}

/**
 * Сервис для работы с медиа
 */
class MediaService {
  /**
   * Захват видео и аудио
   * @param {Object} constraints Ограничения
   * @returns {Promise<MediaStream>} Поток медиа
   */
  async getMediaStream(constraints = { video: true, audio: true }) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.error('[Media] Ошибка захвата медиа:', error);
      throw new Error('Не удалось получить доступ к камере или микрофону');
    }
  }
  
  /**
   * Захват экрана
   * @returns {Promise<MediaStream>} Поток экрана
   */
  async getScreenStream() {
    try {
      if (navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true
        });
        return stream;
      } else {
        // Для старых браузеров
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            mediaSource: 'screen' 
          } 
        });
        return stream;
      }
    } catch (error) {
      console.error('[Media] Ошибка захвата экрана:', error);
      throw new Error('Не удалось получить доступ к экрану');
    }
  }
  
  /**
   * Запись медиа
   * @param {MediaStream} stream Поток для записи
   * @param {Object} options Опции записи
   * @returns {Promise<Blob>} Записанные данные
   */
  async recordMedia(stream, options = { mimeType: 'video/webm' }) {
    return new Promise((resolve, reject) => {
      try {
        const chunks = [];
        const mediaRecorder = new MediaRecorder(stream, options);
        
        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: options.mimeType });
          resolve(blob);
        };
        
        mediaRecorder.onerror = event => {
          reject(new Error('Ошибка записи: ' + event.error.message));
        };
        
        mediaRecorder.start(100); // Сбор данных каждые 100ms
        
        // Автоматическая остановка через 5 минут
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
          }
        }, 300000);
      } catch (error) {
        reject(new Error('Не удалось инициализировать запись: ' + error.message));
      }
    });
  }
}

/**
 * Сервис для работы с P2P соединениями
 */
class P2PService {
  constructor() {
    this.connections = new Map();
    this.localStream = null;
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }
  
  /**
   * Получение локального медиа-потока
   * @param {Object} constraints Ограничения
   * @returns {Promise<MediaStream>} Локальный поток
   */
  async getLocalStream(constraints = { video: true, audio: true }) {
    if (this.localStream) {
      return this.localStream;
    }
    
    const mediaService = new MediaService();
    this.localStream = await mediaService.getMediaStream(constraints);
    return this.localStream;
  }
  
  /**
   * Создание P2P соединения
   * @param {string} remoteId ID удаленного пользователя
   * @returns {RTCPeerConnection} Объект соединения
   */
  createConnection(remoteId) {
    const connection = new RTCPeerConnection(this.configuration);
    
    // Добавление локального потока
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        connection.addTrack(track, this.localStream);
      });
    }
    
    // Обработка ICE кандидатов
    connection.onicecandidate = event => {
      if (event.candidate) {
        // Отправка кандидата через Firebase
        firestore.collection('calls').add({
          type: 'candidate',
          from: auth.currentUser.uid,
          to: remoteId,
          candidate: event.candidate.toJSON()
        });
      }
    };
    
    // Обработка удаленного потока
    connection.ontrack = event => {
      // Здесь должен быть код для обработки удаленного потока
      console.log('[P2P] Получен удаленный поток', event.streams[0]);
    };
    
    this.connections.set(remoteId, connection);
    return connection;
  }
  
  /**
   * Установка удаленного описания
   * @param {string} remoteId ID удаленного пользователя
   * @param {Object} description Описание соединения
   */
  async setRemoteDescription(remoteId, description) {
    const connection = this.connections.get(remoteId);
    if (!connection) return;
    
    await connection.setRemoteDescription(new RTCSessionDescription(description));
  }
  
  /**
   * Добавление удаленного ICE кандидата
   * @param {string} remoteId ID удаленного пользователя
   * @param {Object} candidate ICE кандидат
   */
  async addIceCandidate(remoteId, candidate) {
    const connection = this.connections.get(remoteId);
    if (!connection) return;
    
    try {
      await connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[P2P] Ошибка добавления ICE кандидата:', error);
    }
  }
  
  /**
   * Завершение соединения
   * @param {string} remoteId ID удаленного пользователя
   */
  closeConnection(remoteId) {
    const connection = this.connections.get(remoteId);
    if (connection) {
      connection.close();
      this.connections.delete(remoteId);
    }
  }
}

// Инициализация сервисов
const notificationService = new NotificationService();
const mediaService = new MediaService();
const p2pService = new P2PService();

// Добавление сервисов в глобальный контекст
window.notificationService = notificationService;
window.mediaService = mediaService;
window.p2pService = p2pService;

// ======================================================
// 11. СЛУЖЕБНЫЕ ФУНКЦИИ И МОНИТОРИНГ
// ======================================================

/**
 * Сбор метрик производительности
 */
function collectPerformanceMetrics() {
  if (!window.performance) return;
  
  const metrics = {
    navigation: performance.getEntriesByType('navigation')[0],
    resources: performance.getEntriesByType('resource'),
    paint: performance.getEntriesByName('first-paint')[0],
    contentPaint: performance.getEntriesByName('first-contentful-paint')[0]
  };
  
  // Отправка метрик в аналитику
  if (typeof firebase.analytics === 'function') {
    firebase.analytics().logEvent('performance_metrics', {
      loadTime: metrics.navigation ? metrics.navigation.loadEventEnd : 0,
      firstPaint: metrics.paint ? metrics.paint.startTime : 0,
      firstContentfulPaint: metrics.contentPaint ? metrics.contentPaint.startTime : 0,
      resourceCount: metrics.resources ? metrics.resources.length : 0
    });
  }
  
  return metrics;
}

/**
 * Отправка ошибки в систему мониторинга
 * @param {Error} error Ошибка
 * @param {Object} context Контекст ошибки
 */
function reportError(error, context = {}) {
  console.error('[Error] Отчет об ошибке:', error, context);
  
  // Отправка ошибки в Firebase Crashlytics
  if (typeof firebase.crashlytics === 'function') {
    const crashlytics = firebase.crashlytics();
    crashlytics.log(error.message);
    crashlytics.setCustomKey('context', JSON.stringify(context));
    crashlytics.recordError(error);
  }
  
  // Отправка ошибки в аналитику
  if (typeof firebase.analytics === 'function') {
    firebase.analytics().logEvent('error', {
      message: error.message,
      code: error.code || 'N/A',
      context: JSON.stringify(context)
    });
  }
}

/**
 * Инициализация мониторинга
 */
function initMonitoring() {
  // Сбор метрик при загрузке
  collectPerformanceMetrics();
  
  // Мониторинг производительности
  if (window.performance && performance.timing) {
    window.addEventListener('load', () => {
      setTimeout(collectPerformanceMetrics, 5000);
    });
  }
  
  // Мониторинг использования памяти (если доступно)
  if (performance.memory) {
    setInterval(() => {
      const memory = performance.memory;
      console.log(`[Memory] Использование: ${memory.usedJSHeapSize / 1024 / 1024} MB из ${memory.jsHeapSizeLimit / 1024 / 1024} MB`);
      
      // Отправка в аналитику при превышении порога
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        firebase.analytics().logEvent('high_memory_usage', {
          usage: memory.usedJSHeapSize,
          limit: memory.jsHeapSizeLimit
        });
      }
    }, 30000);
  }
}

// Инициализация мониторинга
initMonitoring();

// ======================================================
// 12. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНФИГУРАЦИЯ
// ======================================================

// Глобальная конфигурация приложения
const APP_CONFIG = {
  version: '2.1.5',
  build: '20231015',
  environment: 'production',
  debug: false,
  maxUploadSize: 50 * 1024 * 1024, // 50MB
  maxMessageLength: 5000,
  messagePollingInterval: 5000,
  idleTimeout: 15 * 60 * 1000, // 15 минут
  retryAttempts: 3,
  retryDelay: 1000 // 1 секунда
};

// Добавление конфигурации в глобальный контекст
window.APP_CONFIG = APP_CONFIG;

// ======================================================
// 13. ОБРАБОТЧИКИ СОБЫТИЙ ЖИЗНЕННОГО ЦИКЛА
// ======================================================

// Обработчик перед закрытием страницы
window.addEventListener('beforeunload', (event) => {
  // Если есть несохраненные данные, можно предупредить пользователя
  const unsavedData = false; // Здесь должна быть проверка
  
  if (unsavedData) {
    event.preventDefault();
    event.returnValue = '';
  }
  
  // Очистка ресурсов
  chatManager.cleanup();
  p2pService.connections.forEach((_, key) => p2pService.closeConnection(key));
  
  // Обновление статуса пользователя
  if (auth.currentUser) {
    firestore.collection('users').doc(auth.currentUser.uid).update({
      status: 'offline',
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
});

// Обработчик ошибок
window.onerror = function(message, source, lineno, colno, error) {
  reportError(error || new Error(message), {
    source: source,
    line: lineno,
    column: colno
  });
  return true; // Предотвращает вывод ошибки в консоль браузера
};

// Обработчик необработанных промисов
window.onunhandledrejection = function(event) {
  reportError(event.reason, {
    type: 'unhandledrejection'
  });
  event.preventDefault();
};

// ======================================================
// 14. ЗАВЕРШАЮЩИЕ ПРОВЕРКИ И ИНИЦИАЛИЗАЦИЯ
// ======================================================

// Проверка поддержки необходимых API
if (typeof window === 'object') {
  // Проверка поддержки Service Workers
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('[ServiceWorker] Зарегистрирован:', registration.scope);
        })
        .catch(error => {
          console.error('[ServiceWorker] Ошибка регистрации:', error);
        });
    });
  }
  
  // Проверка поддержки Web Push
  if ('PushManager' in window) {
    console.log('[Push] Web Push поддерживается');
  }
  
  // Проверка поддержки WebRTC
  if (typeof RTCPeerConnection !== 'undefined') {
    console.log('[WebRTC] WebRTC поддерживается');
  } else {
    console.warn('[WebRTC] WebRTC не поддерживается');
  }
}

// Инициализация приложения после полной загрузки
window.addEventListener('load', () => {
  console.log('[App] Приложение полностью загружено');
  
  // Проверка поддержки браузера
  if (!isBrowserSupported()) {
    showBrowserNotSupported();
    return;
  }
  
  // Проверка состояния сети
  if (!navigator.onLine) {
    window.showError('Нет подключения к интернету. Некоторые функции могут быть недоступны.');
  }
  
  // Инициализация систем
  initSystems();
  
  // Проверка необходимости обновления
  checkForUpdates();
});

/**
 * Проверка наличия обновлений
 */
function checkForUpdates() {
  // Здесь может быть реализована проверка обновлений
  // Например, через проверку версии в Firebase или запрос к API
  console.log('[Update] Проверка обновлений');
  
  // Для примера, проверяем версию из localStorage
  const currentVersion = localStorage.getItem('app_version');
  if (!currentVersion || currentVersion !== APP_CONFIG.version) {
    console.log(`[Update] Найдено обновление: ${currentVersion || 'N/A'} -> ${APP_CONFIG.version}`);
    
    // Сохраняем новую версию
    localStorage.setItem('app_version', APP_CONFIG.version);
    
    // Показываем уведомление об обновлении
    if (currentVersion) {
      window.showSuccess(`Приложение обновлено до версии ${APP_CONFIG.version}`);
    }
  }
}

// ======================================================
// 15. ЗАКЛЮЧЕНИЕ
// ======================================================

console.log(`
  =====================================================
  GOOGLTHAPP - Полная клиентская реализация
  Версия: ${APP_CONFIG.version}
  Сборка: ${APP_CONFIG.build}
  Окружение: ${APP_CONFIG.environment}
  =====================================================
`);

// Экспорт функций для тестирования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AuthManager,
    ChatManager,
    hashPassword,
    isValidEmail,
    checkPasswordStrength,
    formatDate,
    debounce,
    throttle,
    uploadImage,
    uploadUserAvatar
  };
}