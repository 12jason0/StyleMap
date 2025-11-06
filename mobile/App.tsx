import "react-native-gesture-handler";
import React, { createContext, useEffect, useMemo, useState } from "react";
import { NavigationContainer, DefaultTheme, Theme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "./src/screens/HomeScreen";
import CoursesScreen from "./src/screens/CoursesScreen";
import MapScreen from "./src/screens/MapScreen";
import MyPageScreen from "./src/screens/MyPageScreen";
import EscapeScreen from "./src/screens/EscapeScreen";
import { registerForPushNotificationsAsync } from "./src/notifications";

const Tab = createBottomTabNavigator();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: "#6db48c", background: "#ffffff" },
};

export const PushTokenContext = createContext<string | null>(null);

export default function App() {
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = await registerForPushNotificationsAsync();
      setPushToken(t);
    })();
  }, []);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      <PushTokenContext.Provider value={pushToken}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#6db48c",
          tabBarInactiveTintColor: "#99c08e",
          tabBarStyle: { backgroundColor: "#fff", borderTopColor: "rgba(153,192,142,0.5)", borderTopWidth: 2 },
          tabBarIcon: ({ color, size, focused }) => {
            const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
              홈: ["home-outline", "home"],
              코스: ["library-outline", "library"],
              맵: ["compass-outline", "compass"],
              마이: ["person-circle-outline", "person-circle"],
              사건: ["search-outline", "search"],
            };
            const pair = icons[route.name] || ["ellipse-outline", "ellipse"];
            return <Ionicons name={focused ? pair[1] : pair[0]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="코스" component={CoursesScreen} />
        <Tab.Screen name="맵" component={MapScreen} />
        <Tab.Screen name="마이" component={MyPageScreen} />
        <Tab.Screen name="홈" component={HomeScreen} />
        <Tab.Screen name="사건" component={EscapeScreen} />
      </Tab.Navigator>
      </PushTokenContext.Provider>
    </NavigationContainer>
  );
}


