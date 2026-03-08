import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { supabase } from "../../lib/supabase";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      if (Platform.OS === "web") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        if (error) setError(error.message);
      } else {
        const redirectUri = makeRedirectUri({ scheme: "kneebackapp" });
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: redirectUri, skipBrowserRedirect: true },
        });
        if (error) { setError(error.message); return; }
        if (!data.url) { setError("Could not start Google sign-in"); return; }

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (result.type === "success") {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
          if (exchangeError) setError(exchangeError.message);
        }
      }
    } catch {
      setError("Google sign-in failed");
    } finally {
      setLoading(false);
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

        {error && (
          <Text className="text-red-500 text-sm text-center mb-4">{error}</Text>
        )}

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
          className={`bg-surface border border-border rounded-2xl py-4 items-center mb-6 ${loading ? "opacity-50" : ""}`}
          onPress={handleGoogleSignIn}
          disabled={loading}
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
