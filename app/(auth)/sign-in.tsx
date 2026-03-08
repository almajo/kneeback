import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { supabase } from "../../lib/supabase";

let GoogleSignin: any = null;
try {
  GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "" });
} catch {}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert("Error", error.message);
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    if (!GoogleSignin) {
      Alert.alert("Not available", "Google Sign-In requires a development build.");
      return;
    }
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.data?.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.data.idToken,
        });
        if (error) Alert.alert("Error", error.message);
      }
    } catch (error: any) {
      if (error.code !== "SIGN_IN_CANCELLED") {
        Alert.alert("Error", "Google sign-in failed");
      }
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-background">
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl font-bold text-center text-primary mb-2">KneeBack</Text>
        <Text className="text-base text-center mb-10" style={{ color: "#6B6B6B" }}>Your knee's daily companion</Text>

        <TextInput
          className="bg-surface border border-border rounded-2xl px-4 py-4 text-base mb-4"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="bg-surface border border-border rounded-2xl px-4 py-4 text-base mb-6"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className={`bg-primary rounded-2xl py-4 items-center mb-4 ${loading ? "opacity-50" : ""}`}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">Sign In</Text>
        </TouchableOpacity>

        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-border" />
          <Text className="mx-4" style={{ color: "#A0A0A0" }}>or</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        <TouchableOpacity
          className="bg-surface border border-border rounded-2xl py-4 items-center mb-6"
          onPress={handleGoogleSignIn}
        >
          <Text className="font-bold text-base" style={{ color: "#2D2D2D" }}>Continue with Google</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text style={{ color: "#6B6B6B" }}>No account? </Text>
          <Link href="/(auth)/sign-up">
            <Text className="text-primary font-bold">Sign Up</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
