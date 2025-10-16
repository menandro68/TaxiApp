import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SupportScreen = ({ navigation }) => {
  const [showChatModal, setShowChatModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: 'Hola, ¿en qué puedo ayudarte?', sender: 'support', time: '10:00' }
  ]);

  const supportCategories = [
    {
      id: 1,
      title: 'Problemas con mi viaje',
      icon: 'car-outline',
      color: '#FF6B6B'
    },
    {
      id: 2,
      title: 'Pagos y cobros',
      icon: 'card-outline',
      color: '#4ECDC4'
    },
    {
      id: 3,
      title: 'Seguridad',
      icon: 'shield-checkmark-outline',
      color: '#45B7D1'
    },
    {
      id: 4,
      title: 'Mi cuenta',
      icon: 'person-outline',
      color: '#96CEB4'
    },
    {
      id: 5,
      title: 'Conductor',
      icon: 'people-outline',
      color: '#FFEAA7'
    },
    {
      id: 6,
      title: 'Otro',
      icon: 'help-circle-outline',
      color: '#DDA0DD'
    }
  ];

  const faqs = [
    {
      question: '¿Cómo cancelo un viaje?',
      answer: 'Puedes cancelar tu viaje desde la pantalla principal tocando el botón "Cancelar". Ten en cuenta que pueden aplicar cargos por cancelación.'
    },
    {
      question: '¿Cómo cambio mi método de pago?',
      answer: 'Ve a Menú > Métodos de Pago y selecciona o agrega un nuevo método de pago.'
    },
    {
      question: '¿Qué hago si olvidé algo en el taxi?',
      answer: 'Ve a Mis Viajes, selecciona el viaje y toca "Contactar conductor" o reporta el objeto perdido.'
    },
    {
      question: '¿Cómo reporto un problema con mi viaje?',
      answer: 'Ve a Mis Viajes, selecciona el viaje con problema y toca "Reportar problema".'
    }
  ];

  const handleCallSupport = () => {
    Alert.alert(
      'Llamar a soporte',
      '¿Deseas llamar a nuestro centro de soporte?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Llamar', 
          onPress: () => Linking.openURL('tel:+18095551234')
        }
      ]
    );
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        text: message,
        sender: 'user',
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatMessages([...chatMessages, newMessage]);
      setMessage('');
      
      // Simular respuesta automática
      setTimeout(() => {
        const autoReply = {
          id: chatMessages.length + 2,
          text: 'Gracias por tu mensaje. Un agente te atenderá pronto.',
          sender: 'support',
          time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, autoReply]);
      }, 1000);
    }
  };

  const renderChatModal = () => (
    <Modal
      visible={showChatModal}
      animationType="slide"
      onRequestClose={() => setShowChatModal(false)}
    >
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setShowChatModal(false)}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.chatTitle}>Chat de Soporte</Text>
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>En línea</Text>
          </View>
        </View>

        <ScrollView style={styles.messagesContainer}>
          {chatMessages.map(msg => (
            <View 
              key={msg.id} 
              style={[
                styles.messageWrapper,
                msg.sender === 'user' ? styles.userMessageWrapper : styles.supportMessageWrapper
              ]}
            >
              <View style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.userMessage : styles.supportMessage
              ]}>
                <Text style={[
                  styles.messageText,
                  msg.sender === 'user' ? styles.userMessageText : styles.supportMessageText
                ]}>
                  {msg.text}
                </Text>
                <Text style={styles.messageTime}>{msg.time}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Escribe tu mensaje..."
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSendMessage}
          >
            <Icon name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Centro de Ayuda</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Opciones rápidas */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => setShowChatModal(true)}
          >
            <Icon name="chatbubbles" size={30} color="#007AFF" />
            <Text style={styles.quickActionText}>Chat en vivo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={handleCallSupport}
          >
            <Icon name="call" size={30} color="#34C759" />
            <Text style={styles.quickActionText}>Llamar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => setShowFAQModal(true)}
          >
            <Icon name="help-circle" size={30} color="#FF9500" />
            <Text style={styles.quickActionText}>FAQ</Text>
          </TouchableOpacity>
        </View>

        {/* Categorías de ayuda */}
        <Text style={styles.sectionTitle}>¿Con qué necesitas ayuda?</Text>
        <View style={styles.categoriesGrid}>
          {supportCategories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: category.color + '20' }]}
              onPress={() => {
                setSelectedCategory(category);
                setShowChatModal(true);
              }}
            >
              <Icon name={category.icon} size={30} color={category.color} />
              <Text style={styles.categoryText}>{category.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Información de contacto */}
        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>Otras formas de contacto</Text>
          <TouchableOpacity style={styles.contactItem}>
            <Icon name="mail" size={20} color="#007AFF" />
            <Text style={styles.contactText}>soporte@taxiapp.com</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactItem}>
            <Icon name="logo-whatsapp" size={20} color="#25D366" />
            <Text style={styles.contactText}>WhatsApp: +1 809 555 1234</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de FAQ */}
      <Modal
        visible={showFAQModal}
        animationType="slide"
        onRequestClose={() => setShowFAQModal(false)}
      >
        <View style={styles.faqContainer}>
          <View style={styles.faqHeader}>
            <TouchableOpacity onPress={() => setShowFAQModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.faqTitle}>Preguntas Frecuentes</Text>
          </View>
          <ScrollView style={styles.faqContent}>
            {faqs.map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {renderChatModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 15,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
  },
  categoryCard: {
    width: '45%',
    margin: '2.5%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  categoryText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  contactInfo: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  contactText: {
    marginLeft: 15,
    fontSize: 14,
    color: '#007AFF',
  },
  
  // Estilos del chat
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatHeader: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  chatTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 20,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  onlineText: {
    color: '#fff',
    fontSize: 12,
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messageWrapper: {
    marginBottom: 10,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  supportMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
  },
  userMessage: {
    backgroundColor: '#007AFF',
  },
  supportMessage: {
    backgroundColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 14,
  },
  userMessageText: {
    color: '#fff',
  },
  supportMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 5,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Estilos FAQ
  faqContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  faqTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 24,
  },
  faqContent: {
    padding: 20,
  },
  faqItem: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default SupportScreen;