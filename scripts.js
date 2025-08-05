// scripts.js
// Основные скрипты для всего приложения

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

// Проверка валидности email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

// Проверка силы пароля
function checkPasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  return strength;
}

// Форматирование даты
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

// Дебаунс функции
function debounce(func, delay) {
  let inDebounce;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(() => func.apply(context, args), delay);
  };
}

// Троттлинг функции
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

// Загрузка изображения в Firebase Storage
async function uploadImage(file, path) {
  if (!file) {
    throw new Error('Файл не указан');
  }
  
  const storageRef = firebase.getStorage().ref();
  const fileRef = storageRef.child(`${path}/${Date.now()}_${file.name}`);
  
  const uploadTask = fileRef.put(file);
  
  return new Promise((resolve, reject) => {
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
      async () => {
        // Завершение загрузки
        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
        console.log('[Storage] Файл доступен по:', downloadURL);
        resolve(downloadURL);
      }
    );
  });
}

// Загрузка аватара пользователя
async function uploadUserAvatar(file) {
  try {
    const user = firebase.getAuth().currentUser;
    if (!user) throw new Error('Пользователь не авторизован');
    
    const downloadURL = await uploadImage(file, `avatars/${user.uid}`);
    
    // Обновление профиля пользователя
    await user.updateProfile({
      photoURL: downloadURL
    });
    
    // Обновление данных в Firestore
    await firebase.getFirestore().collection('users').doc(user.uid).update({
      avatar: downloadURL,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return downloadURL;
  } catch (error) {
    console.error('[Auth] Ошибка загрузки аватара:', error);
    throw error;
  }
}

// Обработчик регистрации
async function registerUser(name, email, password) {
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
    const userCredential = await firebase.getAuth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Обновление профиля с именем
    await user.updateProfile({
      displayName: name
    });
    
    // Создание документа пользователя в Firestore
    await firebase.getFirestore().collection('users').doc(user.uid).set({
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

// Обработчик входа
async function loginUser(email, password) {
  try {
    // Проверка валидности email
    if (!isValidEmail(email)) {
      throw new Error('Неверный формат email');
    }
    
    // Вход через Firebase Auth
    const userCredential = await firebase.getAuth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    console.log('[Auth] Вход успешен:', user.uid);
    
    // Обновление статуса пользователя
    await firebase.getFirestore().collection('users').doc(user.uid).update({
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

// Обработчик входа через Google
async function loginWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const userCredential = await firebase.getAuth().signInWithPopup(provider);
    const user = userCredential.user;
    
    console.log('[Auth] Вход через Google успешен:', user.uid);
    
    // Проверка существования документа пользователя
    const userDoc = await firebase.getFirestore().collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      // Создание документа пользователя, если его нет
      await firebase.getFirestore().collection('users').doc(user.uid).set({
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
      await firebase.getFirestore().collection('users').doc(user.uid).update({
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

// Выход из системы
async function logoutUser() {
  try {
    const user = firebase.getAuth().currentUser;
    
    if (user) {
      // Обновление статуса пользователя
      await firebase.getFirestore().collection('users').doc(user.uid).update({
        status: 'offline',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Выход из системы
    await firebase.getAuth().signOut();
    console.log('[Auth] Успешный выход из системы');
  } catch (error) {
    console.error('[Auth] Ошибка выхода из системы:', error);
    throw new Error('Не удалось выйти из системы');
  }
}

// Отправка письма для сброса пароля
async function sendPasswordResetEmail(email) {
  try {
    // Проверка валидности email
    if (!isValidEmail(email)) {
      throw new Error('Неверный формат email');
    }
    
    await firebase.getAuth().sendPasswordResetEmail(email);
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

// Проверка существования email
async function checkEmailExists(email) {
  try {
    // Проверка валидности email
    if (!isValidEmail(email)) {
      return false;
    }
    
    const methods = await firebase.getAuth().fetchSignInMethodsForEmail(email);
    return methods.length > 0;
  } catch (error) {
    console.error('[Auth] Ошибка проверки email:', error);
    return false;
  }
}

// Обновление профиля пользователя
async function updateProfile(updates) {
  try {
    const user = firebase.getAuth().currentUser;
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
        firebase.getFirestore().collection('users').doc(user.uid).update(firestoreUpdates)
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

// Обновление пароля пользователя
async function updatePassword(newPassword) {
  try {
    const user = firebase.getAuth().currentUser;
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

// Экспорт функций
window.app = {
  navigateTo,
  showError,
  showSuccess,
  isValidEmail,
  checkPasswordStrength,
  formatDate,
  debounce,
  throttle,
  uploadImage,
  uploadUserAvatar,
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  sendPasswordResetEmail,
  checkEmailExists,
  updateProfile,
  updatePassword
};