import { Stack } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Stack.Screen
        name="search"
        options={{
          title: 'Search',
        }}
      />
      <Stack.Screen
        name="word-detail"
        options={{
          title: 'Word',
        }}
      />
      <Stack.Screen
        name="explore"
        options={{
          title: 'Explore',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          title: 'Help',
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: 'About',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'History',
        }}
      />
      <Stack.Screen
        name="bookmarks"
        options={{
          title: 'Bookmarks',
        }}
      />
      <Stack.Screen
        name="folder-detail"
        options={{
          title: 'Folder',
        }}
      />
      <Stack.Screen
        name="font-size"
        options={{
          title: 'Font Size',
        }}
      />
      <Stack.Screen
        name="learning-languages"
        options={{
          title: 'Learning Languages',
        }}
      />
      <Stack.Screen
        name="custom-questions"
        options={{
          title: 'Custom Questions',
        }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{
          title: 'Privacy Policy',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="native-language-select"
        options={{
          title: 'Native Language',
        }}
      />
      <Stack.Screen
        name="language-select"
        options={{
          title: 'Select Language',
        }}
      />
      <Stack.Screen
        name="theme-select"
        options={{
          title: 'Theme',
        }}
      />
      <Stack.Screen
        name="data-management"
        options={{
          title: 'Data Management',
        }}
      />
      <Stack.Screen
        name="terms-of-service"
        options={{
          title: 'Terms of Service',
        }}
      />
    </Stack>
  );
}
