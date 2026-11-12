import React from 'react';
import {SafeAreaView, Text, View, StyleSheet} from 'react-native';
import {WebView} from 'react-native-webview';
const url = process.env.EXPO_PUBLIC_GAME_URL;
export default function App(){
  if(!url || !/^https:\/\//.test(url)) return <SafeAreaView style={styles.container}><Text style={styles.text}>Konfigurer EXPO_PUBLIC_GAME_URL til spillets offentlige HTTPS-adresse før EAS Build.</Text></SafeAreaView>;
  return <SafeAreaView style={styles.container}><WebView source={{uri:url}} style={{flex:1}} javaScriptEnabled domStorageEnabled originWhitelist={['https://*']} allowsInlineMediaPlayback /> </SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#060b1a',justifyContent:'center'},text:{color:'#dffaff',padding:22,textAlign:'center'}});
