import { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Colors } from "../constants/colors";
import { purgeAllUserData, deleteRemoteUserData } from "../lib/db/purge-user-data";
import { useAuth } from "../lib/auth-context";

export interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  deleting: boolean;
  mode: "reset" | "delete";
}

type Step = "confirm" | "ask-local" | "working";

export function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
  deleting,
  mode,
}: DeleteAccountModalProps) {
  const { session, signOut } = useAuth();
  const [step, setStep] = useState<Step>("confirm");
  const [working, setWorking] = useState(false);

  const isReset = mode === "reset";

  const title = isReset ? "Reset App?" : "Delete Account?";
  const body = isReset
    ? "This will erase all your local recovery data and return you to the welcome screen. This cannot be undone."
    : "This will permanently delete your account and all cloud data. This cannot be undone.";
  const buttonLabel = isReset ? "Reset Everything" : "Delete My Account";

  function handleClose() {
    if (!working && !deleting) {
      setStep("confirm");
      onClose();
    }
  }

  async function handleConfirm() {
    if (isReset) {
      // Reset mode: use the parent-provided handler as-is
      await onConfirm();
      setStep("confirm");
      return;
    }

    // Delete mode: delete remote first, then ask about local
    setWorking(true);
    setStep("working");
    try {
      if (session?.user.id) {
        await deleteRemoteUserData(session.user.id);
      }
      setStep("ask-local");
    } catch (err) {
      console.error("[DeleteAccountModal] deleteRemoteUserData error:", err);
      setStep("confirm");
    } finally {
      setWorking(false);
    }
  }

  async function handleDeleteLocal() {
    setWorking(true);
    try {
      await purgeAllUserData();
      try {
        await signOut();
      } catch (err) {
        console.error("[DeleteAccountModal] signOut error:", err);
      }
      setStep("confirm");
      onClose();
    } catch (err) {
      console.error("[DeleteAccountModal] purgeAllUserData error:", err);
      setWorking(false);
    }
  }

  async function handleKeepLocal() {
    setWorking(true);
    try {
      try {
        await signOut();
      } catch (err) {
        console.error("[DeleteAccountModal] signOut error:", err);
      }
      setStep("confirm");
      onClose();
    } finally {
      setWorking(false);
    }
  }

  const isBusy = working || deleting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <View
          className="bg-surface rounded-2xl p-6 mx-6 w-full"
          style={{ maxWidth: 360 }}
        >
          {step === "confirm" && (
            <>
              <Text
                className="text-xl font-bold mb-2"
                style={{ color: "#2D2D2D" }}
              >
                {title}
              </Text>
              <Text className="text-base mb-6" style={{ color: "#6B6B6B" }}>
                {body}
              </Text>
              <TouchableOpacity
                className={`rounded-xl py-3 items-center mb-3 ${isBusy ? "opacity-50" : ""}`}
                style={{ backgroundColor: Colors.error }}
                onPress={handleConfirm}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    {buttonLabel}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-xl py-3 items-center bg-background border border-border"
                onPress={handleClose}
                disabled={isBusy}
              >
                <Text
                  className="font-semibold text-base"
                  style={{ color: "#2D2D2D" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === "working" && (
            <View className="items-center py-4">
              <ActivityIndicator color={Colors.error} size="large" />
              <Text className="mt-4 text-base" style={{ color: "#6B6B6B" }}>
                Deleting account...
              </Text>
            </View>
          )}

          {step === "ask-local" && (
            <>
              <Text
                className="text-xl font-bold mb-2"
                style={{ color: "#2D2D2D" }}
              >
                Delete local data too?
              </Text>
              <Text className="text-base mb-6" style={{ color: "#6B6B6B" }}>
                Your cloud account has been deleted. Would you also like to erase the data stored on this device?
              </Text>
              <TouchableOpacity
                className={`rounded-xl py-3 items-center mb-3 ${working ? "opacity-50" : ""}`}
                style={{ backgroundColor: Colors.error }}
                onPress={handleDeleteLocal}
                disabled={working}
              >
                {working ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Yes, Delete Local Data
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className={`rounded-xl py-3 items-center bg-background border border-border ${working ? "opacity-50" : ""}`}
                onPress={handleKeepLocal}
                disabled={working}
              >
                <Text
                  className="font-semibold text-base"
                  style={{ color: "#2D2D2D" }}
                >
                  No, Keep Local Data
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
