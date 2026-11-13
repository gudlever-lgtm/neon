import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {WebView} from 'react-native-webview';
import bundle from './neon-bundle.generated.json';
export default function App(){
  return <SafeAreaView style={styles.container}><WebView source={{html:bundle.html,baseUrl:'https://dulmens.dk/neon/'}} style={{flex:1}} javaScriptEnabled domStorageEnabled originWhitelist={['https://*']} allowsInlineMediaPlayback /> </SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#060b1a'}});
