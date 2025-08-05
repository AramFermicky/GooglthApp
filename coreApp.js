// coreApp.js
// Рабочая часть для работы сложных функций

// Глобальные переменные
let currentUser = null;
let chatManager = null;
let onlineUsers = [];

// Класс для управления чатами
class ChatManager {
  constructor() {
    this.groups = [];
    this.chats = [];
    this.chatListeners = {};
    this.groupListeners = {};
    this.onlineUsersListener = null;
  }
  
  init() {
    if (!firebase.isReady()) {
      console.error('[Chat] Firebase не инициализирована');
      return;
    }
    
    const userId = firebase.getAuth().currentUser?.uid;
    if (!userId) return;
    
    this.loadGroups();
    this.loadChats();
    this.setupOnlineUsersListener();
  }
  
  loadGroups() {
    const userId = firebase.getAuth().currentUser?.uid;
    if (!userId) return;
    
    // Удаление предыдущего слушателя
    if (this.groupListeners[userId]) {
      this.groupListeners[userId]();
      delete this.groupListeners[userId];
    }
    
    // Создание нового слушателя
    this.groupListeners[userId] = firebase.getFirestore().collection('groups')
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
  
  loadChats() {
    const userId = firebase.getAuth().currentUser?.uid;
    if (!userId) return;
    
    // Удаление предыдущего слушателя
    if (this.chatListeners[userId]) {
      this.chatListeners[userId]();
      delete this.chatListeners[userId];
    }
    
    // Создание нового слушателя
    this.chatListeners[userId] = firebase.getFirestore().collection('chats')
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
  
  setupOnlineUsersListener() {
    if (this.onlineUsersListener) {
      this.onlineUsersListener();
    }
    
    this.onlineUsersListener = firebase.getFirestore().collection('users')
      .where('status', '==', 'online')
      .onSnapshot(snapshot => {
        onlineUsers = snapshot.docs.map(doc => {
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
  
  openChat(chatId) {
    navigateTo(`p2p-chat.html?chatId=${chatId}`);
  }
  
  openGroupChat(groupId) {
    navigateTo(`p2p-chat.html?groupId=${groupId}`);
  }
  
  async startChatWithUser(userId) {
    if (!firebase.getAuth().currentUser) {
      showError('Пожалуйста, войдите в систему');
      return;
    }
    
    try {
      const currentUser = firebase.getAuth().currentUser;
      const chatId = [currentUser.uid, userId].sort().join('_');
      
      // Проверка существования чата
      const chatRef = firebase.getFirestore().collection('chats').doc(chatId);
      const chatDoc = await chatRef.get();
      
      if (chatDoc.exists) {
        // Чат существует, открываем его
        this.openChat(chatId);
      } else {
        // Создание нового чата
        const userDoc = await firebase.getFirestore().collection('users').doc(userId).get();
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
      showError('Не удалось начать чат. Пожалуйста, попробуйте еще раз.');
    }
  }
  
  async createGroup(groupData) {
    if (!firebase.getAuth().currentUser) {
      return { success: false, message: 'Пожалуйста, войдите в систему' };
    }
    
    try {
      const currentUser = firebase.getAuth().currentUser;
      
      // Создание документа группы
      const groupRef = await firebase.getFirestore().collection('groups').add({
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
      await firebase.getFirestore().collection('chats').doc(groupRef.id).set({
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
  
  async sendMessage(chatId, messageData) {
    if (!firebase.getAuth().currentUser) {
      return { success: false, message: 'Пожалуйста, войдите в систему' };
    }
    
    try {
      const currentUser = firebase.getAuth().currentUser;
      
      // Создание документа сообщения
      const messageRef = await firebase.getFirestore().collection('messages').add({
        chatId: chatId,
        senderId: currentUser.uid,
        text: messageData.text,
        media: messageData.media || null,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        readBy: [currentUser.uid],
        status: 'sent'
      });
      
      // Обновление последнего сообщения в чате
      await firebase.getFirestore().collection('chats').doc(chatId).update({
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
        await firebase.getFirestore().collection('groups').doc(chatId).update({
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
  
  async loadMessages(chatId, limit = 50) {
    try {
      const messagesSnapshot = await firebase.getFirestore().collection('messages')
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
  
  async markMessagesAsRead(chatId, messageIds) {
    if (!firebase.getAuth().currentUser || !messageIds.length) return;
    
    const batch = firebase.getFirestore().batch();
    const userId = firebase.getAuth().currentUser.uid;
    
    messageIds.forEach(messageId => {
      const messageRef = firebase.getFirestore().collection('messages').doc(messageId);
      batch.update(messageRef, {
        readBy: firebase.firestore.FieldValue.arrayUnion(userId)
      });
    });
    
    await batch.commit();
  }
  
  async searchUsers(query) {
    if (!query || query.length < 2) return [];
    
    try {
      const usersSnapshot = await firebase.getFirestore().collection('users')
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