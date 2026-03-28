import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Colors } from "../constants/colors";

const CONTACT_EMAIL = "kneebackapp@gmail.com";

export default function DeleteAccountPage() {
  function handleEmailPress() {
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Account%20Deletion%20Request`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Delete Your Account</Text>

      <Text style={styles.body}>
        You can delete your KneeBack account in two ways:
      </Text>

      <Text style={styles.sectionTitle}>Option 1 — In the App</Text>
      <Text style={styles.body}>
        Open the app, go to the{" "}
        <Text style={styles.bold}>Profile</Text> tab, scroll to the bottom, and
        tap{" "}
        <Text style={styles.bold}>Delete Account</Text>. This will immediately
        and permanently delete all your data from our servers.
      </Text>

      <Text style={styles.sectionTitle}>Option 2 — Email Request</Text>
      <Text style={styles.body}>
        Send a deletion request to{" "}
        <TouchableOpacity onPress={handleEmailPress}>
          <Text style={styles.link}>{CONTACT_EMAIL}</Text>
        </TouchableOpacity>{" "}
        from the email address associated with your account. We will process
        your request within 30 days.
      </Text>

      <Text style={styles.sectionTitle}>What Gets Deleted</Text>
      <Text style={styles.body}>
        When your account is deleted, the following data is permanently removed:
      </Text>
      <Text style={styles.bullet}>• Your email address and authentication credentials</Text>
      <Text style={styles.bullet}>• All recovery tracking data (exercises, ROM logs, milestones)</Text>
      <Text style={styles.bullet}>• Your surgery profile and settings</Text>
      <Text style={styles.bullet}>• Any community posts or activity linked to your account</Text>

      <Text style={styles.note}>
        Deletion is permanent and cannot be undone.
      </Text>

      <Text style={styles.footer}>
        For questions, contact us at{" "}
        <Text style={styles.link} onPress={handleEmailPress}>
          {CONTACT_EMAIL}
        </Text>
        .
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingTop: Platform.OS === "web" ? 48 : 24,
    maxWidth: 640,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: Colors.text,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 17,
    color: Colors.text,
    marginTop: 24,
    marginBottom: 8,
  },
  body: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 4,
  },
  bold: {
    fontFamily: "Outfit_600SemiBold",
    color: Colors.text,
  },
  bullet: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginLeft: 8,
  },
  link: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  note: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.primaryDark,
    marginTop: 20,
    padding: 12,
    backgroundColor: "#FFF0EB",
    borderRadius: 8,
  },
  footer: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 32,
    marginBottom: 48,
    lineHeight: 22,
  },
});
