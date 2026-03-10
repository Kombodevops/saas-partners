import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Función para probar la conexión a Firestore
export async function testFirestoreConnection() {
  try {
    console.log('🔥 Probando conexión a Firestore...');
    
    // Intentar leer la colección partners
    const partnersRef = collection(db, 'partners');
    const querySnapshot = await getDocs(partnersRef);
    
    console.log(`✅ Conexión exitosa a Firestore`);
    console.log(`📊 Encontrados ${querySnapshot.docs.length} partners en la base de datos`);
    
    // Mostrar primeros 3 partners si existen
    if (querySnapshot.docs.length > 0) {
      console.log('📋 Primeros partners:');
      querySnapshot.docs.slice(0, 3).forEach((doc) => {
        console.log(`  - ID: ${doc.id}, Email: ${doc.data().Email || 'No email'}`);
      });
    }
    
    return {
      success: true,
      count: querySnapshot.docs.length,
      message: 'Conexión a Firestore establecida correctamente'
    };
  } catch (error) {
    console.error('❌ Error al conectar a Firestore:', error);
    return {
      success: false,
      error: error,
      message: 'Error al conectar con Firestore'
    };
  }
}

// Función para crear un documento de prueba
export async function createTestDocument() {
  try {
    const testRef = doc(collection(db, 'test'));
    await setDoc(testRef, {
      timestamp: new Date(),
      message: 'Test de conexión desde Next.js',
      project: 'Komvo Partners'
    });
    
    console.log('✅ Documento de prueba creado en Firestore');
    return { success: true, id: testRef.id };
  } catch (error) {
    console.error('❌ Error al crear documento de prueba:', error);
    return { success: false, error };
  }
}
