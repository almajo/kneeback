import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { supabase } from "../../lib/supabase";

let GoogleSignin: any = null;
try {
  GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
} catch {}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length <= 6) return "Password must be more than 6 characters.";
  if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function handleSignUp() {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (emailError || passwordError) {
      setErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
      return;
    }
    setErrors({});
    setLoading(true);
    const { data: { session }, error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert("Error", error.message);
    else if (!session) Alert.alert("Check your email", "We sent you a verification link.");
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
        <Text className="text-4xl font-bold text-center text-primary mb-2">Join KneeBack</Text>
        <Text className="text-base text-center mb-10" style={{ color: "#6B6B6B" }}>Start your recovery journey</Text>

        <TextInput
          className={`bg-surface border rounded-2xl px-4 py-4 text-base ${errors.email ? "border-red-500 mb-1" : "border-border mb-4"}`}
          placeholder="Email"
          value={email}
          onChangeText={(v) => { setEmail(v); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {errors.email ? <Text className="text-red-500 text-sm mb-3 ml-1">{errors.email}</Text> : null}

        <TextInput
          className={`bg-surface border rounded-2xl px-4 py-4 text-base ${errors.password ? "border-red-500 mb-1" : "border-border mb-6"}`}
          placeholder="Password (letters, numbers, 7+ chars)"
          value={password}
          onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
          secureTextEntry
        />
        {errors.password ? <Text className="text-red-500 text-sm mb-5 ml-1">{errors.password}</Text> : null}

        <TouchableOpacity
          className={`bg-primary rounded-2xl py-4 items-center mb-4 ${loading ? "opacity-50" : ""}`}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">Create Account</Text>
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
          <Text style={{ color: "#6B6B6B" }}>Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text className="text-primary font-bold">Sign In</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
