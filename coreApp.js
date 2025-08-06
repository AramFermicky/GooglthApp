// coreApp.js
// Рабочая часть для работы сложных функций

// Глобальные переменные
let currentUser = null;
let chatManager = null;
let onlineUsers = [];

// Класс для управления чатами
class ChatManager {
  constructor() {
    this.chats = [];
    this.chatListeners = {};
    this.onlineUsersListener = null;
  }
  
  init() {
    if (!firebase.isReady()) {
      console.error('[Chat] Firebase не инициализирована');
      return;
    }
    
    const userId = firebase.getAuth().currentUser?.uid;
    if (!userId) return;
    
    this.loadChats();
    this.setupOnlineUsersListener();
  }
  
  loadChats() {
    const userId = firebase.getAuth().currentUser?.uid;
    if (!userId) return;
    
    // Удаление предыдущего слушателя
    if (this.chatListeners[userId]) {
      this.chatListeners[userId]();
      delete this.chatListeners[userId];
    }
    
    // Создание нового слушателя
    this.chatListeners[userId] = firebase.getDatabase().ref(`users/${userId}/chats`).on('value', (snapshot) => {
      const chatsData = snapshot.val();
      
      if (chatsData) {
        this.chats = Object.entries(chatsData).map(([id, data]) => ({
          id,
          ...data
        }));
        
        // Сортировка по последнему сообщению
        this.chats.sort((a, b) => 
          (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
        );
        
        // Обновление интерфейса
        this.updateChatsUI();
      } else {
        this.chats = [];
        this.updateChatsUI();
      }
    }, error => {
      console.error('[Chat] Ошибка загрузки чатов:', error);
    });
  }
  
  setupOnlineUsersListener() {
    if (this.onlineUsersListener) {
      this.onlineUsersListener();
    }
    
    this.onlineUsersListener = firebase.getDatabase().ref('users').orderByChild('status').equalTo('online').on('value', (snapshot) => {
      const usersData = snapshot.val();
      
      if (usersData) {
        onlineUsers = Object.entries(usersData).map(([id, data]) => ({
          id,
          name: data.name,
          avatar: data.avatar,
          lastSeen: data.lastSeen
        }));
      } else {
        onlineUsers = [];
      }
      
      // Обновление интерфейса
      this.updateOnlineUsersUI();
    }, error => {
      console.error('[Chat] Ошибка загрузки онлайн-пользователей:', error);
    });
  }
  
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
      
      // Получаем информацию о собеседнике
      const userId = firebase.getAuth().currentUser.uid;
      const otherUserId = chat.id.split('_').find(id => id !== userId);
      
      // Загружаем информацию о собеседнике
      firebase.getDatabase().ref(`users/${otherUserId}`).once('value', (snapshot) => {
        const userData = snapshot.val();
        const lastMessage = chat.lastMessage || 'Нет сообщений';
        
        chatElement.innerHTML = `
          <div class="chat-avatar">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="#4285f4">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div class="chat-info">
            <div class="chat-name">${userData ? userData.name : 'Пользователь'}</div>
            <div class="chat-status">${lastMessage}</div>
          </div>
        `;
        
        chatElement.addEventListener('click', () => {
          navigateTo(`p2p-chat.html?chatId=${chat.id}`);
        });
        
        chatsList.appendChild(chatElement);
      });
    });
  }
  
  updateOnlineUsersUI() {
    const onlineUsersList = document.getElementById('online-users');
    if (!onlineUsersList) return;
    
    // Очистка списка
    onlineUsersList.innerHTML = '';
    
    if (onlineUsers.length === 0) {
      onlineUsersList.innerHTML = `
        <div class="no-online-users">
          <div class="empty-icon">👥</div>
          <p>Нет пользователей онлайн</p>
        </div>
      `;
      return;
    }
    
    // Добавление пользователей
    onlineUsers.forEach(user => {
      const userElement = document.createElement('div');
      userElement.className = 'online-user';
      userElement.dataset.userId = user.id;
      userElement.innerHTML = `
        <div class="online-avatar">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="#4285f4">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <div class="online-status"></div>
        </div>
        <div class="online-info">
          <div class="online-name">${user.name}</div>
          <div class="online-status-text">Онлайн</div>
        </div>
      `;
      
      userElement.addEventListener('click', () => {
        // Создаем ID чата
        const userId = firebase.getAuth().currentUser.uid;
        const userIds = [userId, user.id].sort();
        const chatId = userIds.join('_');
        
        // Переходим к чату
        navigateTo(`p2p-chat.html?chatId=${chatId}`);
      });
      
      onlineUsersList.appendChild(userElement);
    });
  }
  
  async createChatWithUser(userId) {
    if (!firebase.getAuth().currentUser) {
      return { success: false, message: 'Пожалуйста, войдите в систему' };
    }
    
    try {
      const currentUser = firebase.getAuth().currentUser;
      
      // Создаем ID чата (сортируем ID для уникальности)
      const userIds = [currentUser.uid, userId].sort();
      const chatId = userIds.join('_');
      
      // Проверка существования чата
      const chatRef = firebase.getDatabase().ref(`chats/${chatId}`);
      const chatSnapshot = await chatRef.once('value');
      const chatExists = chatSnapshot.exists();
      
      if (!chatExists) {
        // Создание нового чата
        await chatRef.set({
          participants: [currentUser.uid, userId],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastMessage: null,
          lastMessageTime: Date.now()
        });
        
        // Добавляем чат в список чатов для обоих пользователей
        await firebase.getDatabase().ref(`users/${currentUser.uid}/chats/${chatId}`).set({
          lastMessage: 'Чат создан',
          lastMessageTime: Date.now()
        });
        
        await firebase.getDatabase().ref(`users/${userId}/chats/${chatId}`).set({
          lastMessage: 'Чат создан',
          lastMessageTime: Date.now()
        });
      }
      
      console.log('[Chat] Чат создан/найден успешно:', chatId);
      return { success: true, chatId: chatId };
    } catch (error) {
      console.error('[Chat] Ошибка создания чата:', error);
      return { success: false, message: 'Не удалось создать чат. Пожалуйста, попробуйте еще раз.' };
    }
  }
  
  async sendMessage(chatId, messageText) {
    if (!firebase.getAuth().currentUser) {
      return { success: false, message: 'Пожалуйста, войдите в систему' };
    }
    
    try {
      const currentUser = firebase.getAuth().currentUser;
      const timestamp = Date.now();
      
      // Создание сообщения
      const messageRef = firebase.getDatabase().ref(`messages/${chatId}`).push();
      await messageRef.set({
        text: messageText,
        sender: currentUser.uid,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      // Обновление информации о чате
      await firebase.getDatabase().ref(`chats/${chatId}`).update({
        lastMessage: messageText,
        lastMessageTime: timestamp
      });
      
      // Обновление информации в списке чатов для обоих пользователей
      const userIds = chatId.split('_');
      for (const userId of userIds) {
        await firebase.getDatabase().ref(`users/${userId}/chats/${chatId}`).update({
          lastMessage: messageText,
          lastMessageTime: timestamp
        });
      }
      
      console.log('[Chat] Сообщение отправлено успешно:', messageRef.key);
      return { success: true, messageId: messageRef.key };
    } catch (error) {
      console.error('[Chat] Ошибка отправки сообщения:', error);
      return { success: false, message: 'Не удалось отправить сообщение. Пожалуйста, попробуйте еще раз.' };
    }
  }
  
  cleanup() {
    // Удаление слушателей
    Object.values(this.chatListeners).forEach(unsubscribe => unsubscribe());
    
    if (this.onlineUsersListener) {
      this.onlineUsersListener();
    }
    
    this.chatListeners = {};
    this.onlineUsersListener = null;
  }
}

// Инициализация менеджера чатов
function initChatManager() {
  if (!chatManager) {
    chatManager = new ChatManager();
  }
  return chatManager;
}

// Экспорт функций
window.chatManager = {
  init: initChatManager,
  get: () => chatManager
};