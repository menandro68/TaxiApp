import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';

export default function SupportChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: '¡Hola! Soy tu asistente de soporte 24/7. ¿En qué puedo ayudarte?',
      sender: 'support',
      time: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  // Categorías de problemas comunes
  const quickActions = [
    { id: 1, text: '🚨 Emergencia', action: 'emergency' },
    { id: 2, text: '🚗 Problema con viaje', action: 'trip' },
    { id: 3, text: '💰 Problema de pago', action: 'payment' },
    { id: 4, text: '📱 Problema técnico', action: 'technical' },
  ];

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'driver',
      time: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputText('');
    
    // Simular respuesta del soporte
    simulateResponse(inputText);
  };

  const simulateResponse = (userMessage) => {
    setIsTyping(true);
    
    setTimeout(() => {
      let responseText = '';
      
      if (userMessage.toLowerCase().includes('emergencia') || 
          userMessage.toLowerCase().includes('ayuda')) {
        responseText = '🚨 Entiendo que es urgente. Un agente se conectará contigo en menos de 1 minuto. Mientras tanto, ¿puedes describir la situación?';
      } else if (userMessage.toLowerCase().includes('pago')) {
        responseText = 'Verificaré tu problema de pago. ¿Es sobre un viaje específico o tu balance general?';
      } else if (userMessage.toLowerCase().includes('viaje')) {
        responseText = 'Veo que tienes un problema con un viaje. ¿Puedes darme el ID del viaje o describir qué pasó?';
      } else {
        responseText = 'Entiendo tu consulta. Un agente especializado te atenderá pronto. ¿Hay algo más que debas agregar?';
      }

      const supportMessage = {
        id: messages.length + 2,
        text: responseText,
        sender: 'support',
        time: new Date(),
      };

      setMessages(prev => [...prev, supportMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickAction = (action) => {
    switch(action) {
      case 'emergency':
        Alert.alert(
          '🚨 Modo Emergencia',
          'Conectando con soporte prioritario...',
          [
            { text: 'Llamar 911', onPress: () => console.log('Llamando 911') },
            { text: 'Soporte Urgente', onPress: () => sendQuickMessage('EMERGENCIA: Necesito ayuda inmediata') }
          ]
        );
        break;
      case 'trip':
        sendQuickMessage('Tengo un problema con mi viaje actual');
        break;
      case 'payment':
        sendQuickMessage('Necesito ayuda con un problema de pago');
        break;
      case 'technical':
        sendQuickMessage('La app no está funcionando correctamente');
        break;
    }
  };

  const sendQuickMessage = (text) => {
    setInputText(text);
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Soporte 24/7</Text>
        <View style={styles.statusIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.statusText}>En línea</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickActionsContainer}
      >
        {quickActions.map(action => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickActionButton}
            onPress={() => handleQuickAction(action.action)}
          >
            <Text style={styles.quickActionText}>{action.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.map(message => (
          <View
            key={message.id}
            style={[
              styles.messageWrapper,
              message.sender === 'driver' ? styles.driverMessage : styles.supportMessage
            ]}
          >
            <View style={[
              styles.messageBubble,
              message.sender === 'driver' ? styles.driverBubble : styles.supportBubble
            ]}>
              <Text style={[
                styles.messageText,
                message.sender === 'driver' ? styles.driverText : styles.supportText
              ]}>
                {message.text}
              </Text>
            </View>
          </View>
        ))}
        
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>El soporte está escribiendo...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu mensaje..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    fontSize: 24,
    color: '#333',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  quickActionsContainer: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  quickActionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messageWrapper: {
    marginBottom: 10,
  },
  driverMessage: {
    alignItems: 'flex-end',
  },
  supportMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
  },
  driverBubble: {
    backgroundColor: '#3b82f6',
  },
  supportBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  messageText: {
    fontSize: 14,
  },
  driverText: {
    color: 'white',
  },
  supportText: {
    color: '#333',
  },
  typingIndicator: {
    padding: 10,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});