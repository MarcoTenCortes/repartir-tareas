# 🏡 CompartirPiso App

La aplicación definitiva para organizar la vida en tu piso compartido. ¡Menos discusiones, más armonía!
The ultimate app for organizing life in your shared apartment. Less arguments, more harmony!

---

## 🇪🇸 Español

### 🌟 Descripción
**CompartirPiso App** es una aplicación móvil vibrante y moderna, desarrollada con React Native y Expo. Su misión es simplificar la convivencia y la organización en pisos compartidos, permitiendo a los usuarios gestionar de forma colaborativa tareas, listas de la compra, recordatorios, gastos y la distribución de espacios. ¡Di adiós al caos y hola a la armonía en tu hogar compartido!

### 🚀 Características Principales
*   👤 **Autenticación de Usuarios:** Registro, Inicio de Sesión seguro, Recuperación de Contraseña.
*   🤝 **Gestión de Grupos:**
    *   Crear, buscar y unirse a grupos fácilmente.
    *   Opción de abandonar grupos.
    *   👑 **Funciones de Propietario:**
        *   Eliminar grupo.
        *   Cambiar nombre del grupo.
        *   Transferir propiedad del grupo.
        *   Gestionar solicitudes de unión.
        *   Eliminar miembros.
*   ✅ **Gestión de Tareas:**
    *   Crear, asignar/desasignar y eliminar tareas.
    *   Asociar tareas a habitaciones específicas para una mejor organización.
*   🛒 **Lista de la Compra Compartida:**
    *   Añadir artículos de forma colaborativa.
    *   Marcar artículos como comprados.
    *   Eliminar y reordenar artículos dinámicamente.
*   🔔 **Recordatorios Grupales:**
    *   Crear y eliminar recordatorios importantes.
    *   Notificaciones push para que nadie olvide nada.
*   🛋️ **Gestión de Habitaciones:**
    *   Diseño visual para crear y organizar habitaciones.
    *   Modificar propiedades: nombre, tamaño, rotación, forma y posición.
*   💸 **Seguimiento de Pagos:**
    *   Registrar gastos compartidos de manera transparente.
    *   Seguir el estado de pago de cada miembro del grupo.
*   🧑‍💻 **Perfiles de Usuario:**
    *   Personalizar nombre de usuario e icono de perfil.
    *   Cambiar contraseña de forma segura.
*   🎨 **Interfaz Personalizable:** Soporte básico para temas (claro por defecto, ¡con potencial para más!).

### 🛠️ Tecnologías Utilizadas
*   **Frontend:** React Native, Expo (SDK ~53 con cliente de desarrollo)[1]
*   **Backend & Database:** Firebase (Authentication para autenticación, Firestore como base de datos)[1]
*   **Navegación:** React Navigation (v7 para navegación Stack y Bottom Tabs)[1]
*   **Gestión de Estado:** React Context API (`UserContext`, `GroupContext`, `ThemeContext`)[1]
*   **Lenguaje:** JavaScript (ES6+)
*   **UI y Librerías Destacadas:**
    *   `@expo/vector-icons`[1]
    *   `react-native-element-dropdown`[1]
    *   `react-native-animatable`[1]
    *   `react-native-draggable-flatlist`[1]
    *   `react-native-gesture-handler` y `react-native-reanimated`[1]
    *   `expo-notifications`[1]

### 📁 Estructura del Proyecto
El proyecto está organizado de manera modular para facilitar su comprensión y escalabilidad:



### 📋 Prerrequisitos
*   💻 Node.js (v18 o superior recomendado)
*   📦 npm (v8 o superior) o yarn
*   📱 Expo Go app (para ejecutar en dispositivo físico)
*   🔧 Opcional: Android Studio (para emulador Android) / Xcode (para simulador iOS, requiere macOS)

### ⚙️ Configuración e Instalación
1.  **Clona el repositorio** (si está en un host como GitHub):
    ```
    git clone <URL_DEL_REPOSITORIO>
    cd marcotencortes-repartir-tareas
    ```
    Si ya tienes los archivos localmente, simplemente navega al directorio:
    ```
    cd ruta/a/marcotencortes-repartir-tareas
    ```
2.  **Instala las dependencias:**
    ```
    npm install
    # o si prefieres yarn:
    # yarn install
    ```
3.  **Configura Firebase:**
    *   Visita la [Consola de Firebase](https://console.firebase.google.com/) y crea un nuevo proyecto (o usa uno existente).
    *   En tu proyecto, habilita **Authentication** (con proveedor Email/Contraseña) y **Firestore Database** (puedes empezar en modo de prueba y luego ajustar las reglas de seguridad).
    *   Ve a la configuración de tu proyecto Firebase (Project settings) y, en la sección "General", busca "Your apps". Si no tienes una app web (`</>`), créala.
    *   Obtén el objeto de configuración `firebaseConfig` de tu app web.
    *   Copia tu `firebaseConfig` en `src/services/firebase.js`, reemplazando los valores de ejemplo:
        ```
        // src/services/firebase.js
        import { initializeApp } from "firebase/app";
        import { getAuth } from "firebase/auth";
        import { getFirestore } from "firebase/firestore";

        // TODO: Reemplaza esto con la configuración de tu proyecto Firebase
        const firebaseConfig = {
          apiKey: "TU_API_KEY",
          authDomain: "TU_AUTH_DOMAIN",
          projectId: "TU_PROJECT_ID",
          storageBucket: "TU_STORAGE_BUCKET",
          messagingSenderId: "TU_MESSAGING_SENDER_ID",
          appId: "TU_APP_ID"
          // measurementId: "TU_MEASUREMENT_ID" // Opcional
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        export { auth, db };
        ```
4.  ¡Listo para ejecutar!

### ▶️ Scripts Disponibles
Desde la raíz del proyecto, puedes usar los siguientes scripts definidos en `package.json`[1]:
*   `npm start` o `yarn start`:
    🚀 Inicia el servidor de desarrollo de Expo (`expo start --dev-client`). Escanea el código QR con la app Expo Go o ejecuta en un emulador/simulador.
*   `npm run android` o `yarn android`:
    🤖 Construye y ejecuta la aplicación en un emulador o dispositivo Android conectado (`expo run:android`).
*   `npm run ios` o `yarn ios`:
    🍎 Construye y ejecuta la aplicación en un simulador o dispositivo iOS conectado (`expo run:ios`). (Requiere macOS).
*   `npm run web` o `yarn web`:
    🌐 (Experimental) Inicia la aplicación en un navegador web (`expo start --web`). La compatibilidad y funcionalidad pueden variar.

### 📜 Licencia
Este proyecto está bajo la Licencia **0BSD**[1]. Consulta `package.json` para más detalles.
¡Libre como el viento! 🍃

---

## 🇬🇧 English

### 🌟 Description
**CompartirPiso App** is a vibrant and modern mobile application, developed with React Native and Expo. Its mission is to simplify cohabitation and organization in shared apartments, allowing users to collaboratively manage tasks, shopping lists, reminders, expenses, and room layouts. Say goodbye to chaos and hello to harmony in your shared home!

### 🚀 Key Features
*   👤 **User Authentication:** Secure Registration, Login, Password Reset.
*   🤝 **Group Management:**
    *   Easily create, search, and join groups.
    *   Option to leave groups.
    *   👑 **Owner-Specific Functions:**
        *   Delete group.
        *   Rename group.
        *   Transfer group ownership.
        *   Manage join requests.
        *   Remove members.
*   ✅ **Task Management:**
    *   Create, assign/unassign, and delete tasks.
    *   Associate tasks with specific rooms for better organization.
*   🛒 **Shared Shopping List:**
    *   Collaboratively add items.
    *   Mark items as bought.
    *   Dynamically delete and reorder items.
*   🔔 **Group Reminders:**
    *   Create and delete important reminders.
    *   Push notifications so no one forgets anything.
*   🛋️ **Room Management:**
    *   Visual layout designer to create and organize rooms.
    *   Modify properties: name, size, rotation, shape, and position.
*   💸 **Payment Tracking:**
    *   Transparently log shared expenses.
    *   Track each group member's payment status.
*   🧑‍💻 **User Profiles:**
    *   Customize username and profile icon.
    *   Securely change password.
*   🎨 **Customizable Interface:** Basic theme support (light theme by default, with potential for more!).

### 🛠️ Technologies Used
*   **Frontend:** React Native, Expo (SDK ~53 with dev client)[1]
*   **Backend & Database:** Firebase (Authentication for user auth, Firestore for database)[1]
*   **Navigation:** React Navigation (v7 for Stack and Bottom Tabs navigation)[1]
*   **State Management:** React Context API (`UserContext`, `GroupContext`, `ThemeContext`)[1]
*   **Language:** JavaScript (ES6+)
*   **Key UI & Libraries:**
    *   `@expo/vector-icons`[1]
    *   `react-native-element-dropdown`[1]
    *   `react-native-animatable`[1]
    *   `react-native-draggable-flatlist`[1]
    *   `react-native-gesture-handler` & `react-native-reanimated`[1]
    *   `expo-notifications`[1]

### 📁 Project Structure
The project is organized modularly for ease of understanding and scalability:

