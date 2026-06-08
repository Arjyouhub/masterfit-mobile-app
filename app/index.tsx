import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  ImageBackground,
  FlatList,
  Pressable,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import {
  Lock,
  User,
  Plus,
  Search,
  Settings,
  LogOut,
  Calendar,
  Users,
  CreditCard,
  Check,
  MapPin,
  Activity,
  Phone,
  MessageCircle,
  X,
  ChevronDown,
  Trash2,
} from "lucide-react-native";

// Types
type LoginType = "superadmin" | "coordinator";
type TabType = "students" | "attendance" | "fees" | "settings";

interface Student {
  id: number;
  name: string;
  age: number;
  phone: string;
  belt: string;
  joinDate: string;
  batch: string;
  schedule: string;
  branch: string;
  status: string;
  paidMonths?: Record<string, boolean>;
}

interface BatchOption {
  id: string;
  name: string;
  schedule: string;
}

const DEFAULT_BRANCHES = ["Kuttiady", "Perambra", "Orkatteri", "Paarakadav", "Kallachi", "Chambra", "Devargovil"];
const DEFAULT_BATCH_OPTIONS: BatchOption[] = [
  { id: 'batch1', name: 'Batch 1 (Mon - Thu)', schedule: 'Mon-Thu' },
  { id: 'batch2', name: 'Batch 2 (Tue - Fri)', schedule: 'Tue-Fri' },
  { id: 'batch3', name: 'Batch 3 (Wed - Sat)', schedule: 'Wed-Sat' }
];

export default function App() {
  // App Configurations & Connection
  const apiUrl = "https://masterfit-dfz7.onrender.com/api";

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loginType, setLoginType] = useState<LoginType>("coordinator");

  // Login inputs
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBranchLogin, setSelectedBranchLogin] = useState("Kuttiady");
  const [selectedBatchLogin, setSelectedBatchLogin] = useState("admin");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Lists (populated dynamically from server if available)
  const [branches, setBranches] = useState<string[]>(DEFAULT_BRANCHES);
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>(DEFAULT_BATCH_OPTIONS);

  // Dropdown Picker Modals
  const [pickerType, setPickerType] = useState<"branch" | "batch" | "belt" | null>(null);
  const [pickerOptions, setPickerOptions] = useState<{ id: string; name: string }[]>([]);
  const [pickerCallback, setPickerCallback] = useState<((val: string) => void) | null>(null);

  // Authenticated Screen States
  const [activeTab, setActiveTab] = useState<TabType>("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Student Filters / Search
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("All");

  // Enroll Student Form Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [enrollAge, setEnrollAge] = useState("");
  const [enrollPhone, setEnrollPhone] = useState("");
  const [enrollBelt, setEnrollBelt] = useState("White");
  const [enrollBatch, setEnrollBatch] = useState("Batch 1 (Mon - Thu)");
  const [enrollSchedule, setEnrollSchedule] = useState("Mon-Thu");
  const [enrollBranch, setEnrollBranch] = useState("Kuttiady");
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Attendance State
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceBranch, setAttendanceBranch] = useState("Kuttiady");
  const [attendanceBatch, setAttendanceBatch] = useState("batch1");
  const [attendanceRecords, setAttendanceRecords] = useState<Record<number, boolean>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Administrative credentials & collections
  const [branchCredentials, setBranchCredentials] = useState<Record<string, { username: string; password?: string }>>({});
  const [batchCredentials, setBatchCredentials] = useState<Record<string, { username: string; password?: string }>>({});
  const [customBranches, setCustomBranches] = useState<string[]>([]);
  const [customBatches, setCustomBatches] = useState<BatchOption[]>([]);

  // Expanded Accordion active panel
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Administrative form inputs
  const [branchForm, setBranchForm] = useState({ branch: "kuttiady", newUsername: "", newPassword: "", confirmPassword: "" });
  const [batchForm, setBatchForm] = useState({ branch: "kuttiady", batch: "batch1", newUsername: "", newPassword: "", confirmPassword: "" });
  const [newBranchForm, setNewBranchForm] = useState({ name: "", username: "", password: "", confirmPassword: "" });
  const [newBatchForm, setNewBatchForm] = useState({ name: "", schedule: "", branch: "kuttiady", username: "", password: "", confirmPassword: "" });

  // Fetch branches & custom batches from backend
  const fetchConfig = async () => {
    try {
      const res = await fetch(`${apiUrl}/credentials`);
      if (res.ok) {
        const data = await res.json();

        // Credentials maps
        setBranchCredentials(data.branchCredentials || {});
        setBatchCredentials(data.batchCredentials || {});

        // Custom lists
        const dbCustomBranches = data.customBranches || [];
        setCustomBranches(dbCustomBranches);
        const dbCustomBatches = (data.customBatches || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          schedule: b.schedule,
        }));
        setCustomBatches(dbCustomBatches);

        const dbBranches = Object.keys(data.branchCredentials || {}).map(
          (b) => b.charAt(0).toUpperCase() + b.slice(1)
        );
        const uniqueBranches = Array.from(
          new Set([...DEFAULT_BRANCHES, ...dbBranches, ...dbCustomBranches])
        );
        setBranches(uniqueBranches);
        setBatchOptions([...DEFAULT_BATCH_OPTIONS, ...dbCustomBatches]);
      }
    } catch (e) {
      console.log("Failed to load server branches, fallback to default", e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfig();
  }, [apiUrl]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("userToken");
        const storedUser = await SecureStore.getItemAsync("loggedInUser");
        const storedLoginType = await SecureStore.getItemAsync("loginType") as LoginType | null;
        
        if (storedToken && storedUser && storedLoginType) {
          setToken(storedToken);
          setLoggedInUser(storedUser);
          setLoginType(storedLoginType);
          setIsLoggedIn(true);

          if (storedLoginType === "coordinator") {
            const storedBranch = await SecureStore.getItemAsync("selectedBranchLogin");
            const storedBatch = await SecureStore.getItemAsync("selectedBatchLogin");
            if (storedBranch) {
              setSelectedBranchFilter(storedBranch);
              setAttendanceBranch(storedBranch);
            }
            if (storedBatch) {
              setAttendanceBatch(storedBatch);
            }
          } else {
            setSelectedBranchFilter("All");
          }
        }
      } catch (e) {
        console.log("Failed to load stored session", e);
      }
    };
    checkLoginStatus();
  }, []);

  // Admin settings update handlers
  const handleUpdateBranchPassword = async () => {
    const br = branchForm.branch.toLowerCase();
    const pass = branchForm.newPassword;
    const user = branchForm.newUsername.trim() || branchCredentials[br]?.username || `admin@${br}`;

    if (!pass || pass !== branchForm.confirmPassword) {
      Alert.alert("Error", "Passwords must match and cannot be empty.");
      return;
    }

    const updatedBranchCreds = {
      ...branchCredentials,
      [br]: { username: user, password: pass }
    };

    try {
      const res = await fetch(`${apiUrl}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchCredentials: updatedBranchCreds })
      });
      if (res.ok) {
        const data = await res.json();
        setBranchCredentials(data.branchCredentials || {});
        setBranchForm({ branch: br, newUsername: "", newPassword: "", confirmPassword: "" });
        Alert.alert("Success", `Credentials for branch "${br.toUpperCase()}" updated successfully!`);
      } else {
        Alert.alert("Failed", "Could not update branch credentials.");
      }
    } catch {
      Alert.alert("Network Error", "Could not save credentials to server.");
    }
  };

  const handleUpdateBatchPassword = async () => {
    const br = batchForm.branch.toLowerCase();
    const bt = batchForm.batch;
    const key = `${br}_${bt}`;
    const pass = batchForm.newPassword;
    const defaultUser = `${bt}@${br}`;
    const user = batchForm.newUsername.trim() || batchCredentials[key]?.username || defaultUser;

    if (!pass || pass !== batchForm.confirmPassword) {
      Alert.alert("Error", "Passwords must match and cannot be empty.");
      return;
    }

    const updatedBatchCreds = {
      ...batchCredentials,
      [key]: { username: user, password: pass }
    };

    try {
      const res = await fetch(`${apiUrl}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchCredentials: updatedBatchCreds })
      });
      if (res.ok) {
        const data = await res.json();
        setBatchCredentials(data.batchCredentials || {});
        setBatchForm({ branch: br, batch: bt, newUsername: "", newPassword: "", confirmPassword: "" });
        Alert.alert("Success", `Credentials for batch "${bt}" updated successfully!`);
      } else {
        Alert.alert("Failed", "Could not update batch credentials.");
      }
    } catch {
      Alert.alert("Network Error", "Could not save credentials to server.");
    }
  };

  const handleAddCustomBranch = async () => {
    const name = newBranchForm.name.trim();
    const user = newBranchForm.username.trim();
    const pass = newBranchForm.password;

    if (!name || !pass || pass !== newBranchForm.confirmPassword) {
      Alert.alert("Error", "Branch name and passwords are required, and passwords must match.");
      return;
    }

    const newBrLower = name.toLowerCase();
    if (branches.some(b => b.toLowerCase() === newBrLower)) {
      Alert.alert("Error", "Branch already exists!");
      return;
    }

    const defaultUser = `admin@${newBrLower}`;
    const finalUser = user || defaultUser;

    const updatedCustomBranches = [...customBranches, name];
    const updatedBranchCreds = {
      ...branchCredentials,
      [newBrLower]: { username: finalUser, password: pass }
    };

    try {
      const res = await fetch(`${apiUrl}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customBranches: updatedCustomBranches,
          branchCredentials: updatedBranchCreds
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCustomBranches(data.customBranches || []);
        setBranchCredentials(data.branchCredentials || {});
        setNewBranchForm({ name: "", username: "", password: "", confirmPassword: "" });
        fetchConfig();
        Alert.alert("Success", `Branch "${name}" created successfully!`);
      } else {
        Alert.alert("Failed", "Could not save custom branch.");
      }
    } catch {
      Alert.alert("Network Error", "Failed to save branch to server.");
    }
  };

  const handleDeleteCustomBranch = (branchToDelete: string) => {
    if (DEFAULT_BRANCHES.includes(branchToDelete)) {
      Alert.alert("Error", "Cannot delete default system branches!");
      return;
    }

    Alert.alert(
      "Delete Branch",
      `Are you sure you want to delete branch "${branchToDelete}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedCustomBranches = customBranches.filter(b => b !== branchToDelete);

            try {
              const res = await fetch(`${apiUrl}/credentials`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customBranches: updatedCustomBranches })
              });
              if (res.ok) {
                const data = await res.json();
                setCustomBranches(data.customBranches || []);
                fetchConfig();
                Alert.alert("Deleted", `Branch "${branchToDelete}" removed successfully.`);
              }
            } catch {
              Alert.alert("Error", "Could not remove branch from server.");
            }
          }
        }
      ]
    );
  };

  const handleAddCustomBatch = async () => {
    const name = newBatchForm.name.trim();
    const schedule = newBatchForm.schedule.trim();
    const br = newBatchForm.branch.toLowerCase();
    const user = newBatchForm.username.trim();
    const pass = newBatchForm.password;

    if (!name || !schedule || !pass || pass !== newBatchForm.confirmPassword) {
      Alert.alert("Error", "Batch name, schedule, and passwords are required, and passwords must match.");
      return;
    }

    if (batchOptions.some(b => b.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert("Error", "A batch with this name already exists!");
      return;
    }

    const id = "batch_" + Date.now();
    const newBatchObj = { id, name, schedule };

    const key = `${br}_${id}`;
    const defaultUser = `${id}@${br}`;
    const finalUser = user || defaultUser;

    const updatedCustomBatches = [...customBatches, newBatchObj];
    const updatedBatchCreds = {
      ...batchCredentials,
      [key]: { username: finalUser, password: pass }
    };

    try {
      const res = await fetch(`${apiUrl}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customBatches: updatedCustomBatches,
          batchCredentials: updatedBatchCreds
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCustomBatches(data.customBatches || []);
        setNewBatchForm({ name: "", schedule: "", branch: "kuttiady", username: "", password: "", confirmPassword: "" });
        fetchConfig();
        Alert.alert("Success", `Batch "${name}" created successfully!`);
      } else {
        Alert.alert("Failed", "Could not save custom batch.");
      }
    } catch {
      Alert.alert("Network Error", "Failed to save batch to server.");
    }
  };

  const handleDeleteCustomBatch = (batchIdToDelete: string, batchName: string) => {
    if (DEFAULT_BATCH_OPTIONS.some(b => b.id === batchIdToDelete)) {
      Alert.alert("Error", "Cannot delete default system batches!");
      return;
    }

    Alert.alert(
      "Delete Batch",
      `Are you sure you want to delete batch "${batchName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedCustomBatches = customBatches.filter(b => b.id !== batchIdToDelete);

            try {
              const res = await fetch(`${apiUrl}/credentials`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customBatches: updatedCustomBatches })
              });
              if (res.ok) {
                const data = await res.json();
                setCustomBatches(data.customBatches || []);
                fetchConfig();
                Alert.alert("Deleted", `Batch "${batchName}" removed successfully.`);
              }
            } catch {
              Alert.alert("Error", "Could not remove batch from server.");
            }
          }
        }
      ]
    );
  };

  // Load students data when logged in
  const fetchStudents = async () => {
    if (!isLoggedIn) return;
    setIsLoadingData(true);
    try {
      const res = await fetch(`${apiUrl}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch {
      Alert.alert("Server Error", "Could not fetch students from server.");
    } finally {
      setIsLoadingData(false);
    }
  };

  // Fetch attendance records from backend
  const fetchAttendance = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${apiUrl}/attendance`);
      if (res.ok) {
        const data = await res.json();
        const dayRecord = data[selectedAttendanceDate] || {};
        const parsedRecords: Record<number, boolean> = {};
        Object.entries(dayRecord).forEach(([id, status]) => {
          parsedRecords[Number(id)] = status === "Present" || status === true;
        });
        setAttendanceRecords(parsedRecords);
      }
    } catch (e) {
      console.log("Failed to fetch attendance:", e);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchStudents();
    }
  }, [isLoggedIn, apiUrl]);

  useEffect(() => {
    if (isLoggedIn && activeTab === "attendance") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAttendance();
    }
  }, [isLoggedIn, activeTab, selectedAttendanceDate]);

  // Login handler
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all credentials.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const bodyPayload =
        loginType === "superadmin"
          ? {
              loginType: "superadmin",
              username: username.toLowerCase().trim(),
              password: password,
            }
          : {
              loginType: "coordinator",
              username: username.toLowerCase().trim(),
              password: password,
              branch: selectedBranchLogin.toLowerCase(),
              batch: selectedBatchLogin,
            };

      const res = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToken(data.token);
        setLoggedInUser(data.username);
        setIsLoggedIn(true);

        try {
          await SecureStore.setItemAsync("userToken", data.token);
          await SecureStore.setItemAsync("loggedInUser", data.username);
          await SecureStore.setItemAsync("loginType", loginType);
          if (loginType === "coordinator") {
            await SecureStore.setItemAsync("selectedBranchLogin", selectedBranchLogin);
            await SecureStore.setItemAsync("selectedBatchLogin", selectedBatchLogin);
          }
        } catch (e) {
          console.log("Failed to save login session", e);
        }

        // Autofill branch filter if coordinator
        if (loginType === "coordinator") {
          setSelectedBranchFilter(selectedBranchLogin);
          setAttendanceBranch(selectedBranchLogin);
          setAttendanceBatch(selectedBatchLogin);
        } else {
          setSelectedBranchFilter("All");
        }
      } else {
        Alert.alert("Authentication Failed", data.error || "Invalid username or password.");
      }
    } catch {
      Alert.alert("Network Error", "Could not reach the authentication server. Verify server address.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${apiUrl}/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      }
    } catch (e) {
      console.log("Logout api error", e);
    }
    
    try {
      await SecureStore.deleteItemAsync("userToken");
      await SecureStore.deleteItemAsync("loggedInUser");
      await SecureStore.deleteItemAsync("loginType");
      await SecureStore.deleteItemAsync("selectedBranchLogin");
      await SecureStore.deleteItemAsync("selectedBatchLogin");
    } catch (e) {
      console.log("Failed to clear stored session", e);
    }

    setToken(null);
    setLoggedInUser(null);
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setStudents([]);
  };

  // Enroll Student
  const handleEnrollStudent = async () => {
    if (!enrollName.trim() || !enrollAge.trim() || !enrollPhone.trim()) {
      Alert.alert("Missing Fields", "Please fill name, age, and phone number.");
      return;
    }

    setIsEnrolling(true);
    try {
      // Replicate client-side unique ID generation matching App.jsx:493
      const newId = students.length > 0 ? Math.max(...students.map((s) => s.id)) + 1 : 1;

      const payload: Student = {
        id: newId,
        name: enrollName,
        age: Number(enrollAge),
        phone: enrollPhone,
        belt: enrollBelt,
        joinDate: new Date().toISOString().split("T")[0],
        batch: enrollBatch,
        schedule: enrollSchedule,
        branch: enrollBranch,
        status: "Active",
        paidMonths: {},
      };

      const res = await fetch(`${apiUrl}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert("Success", `${enrollName} enrolled successfully!`);
        fetchStudents();
        setShowEnrollModal(false);
        // Reset form
        setEnrollName("");
        setEnrollAge("");
        setEnrollPhone("");
        setEnrollBelt("White");
      } else {
        const err = await res.json();
        Alert.alert("Enrollment Failed", err.error || "Unable to save student.");
      }
    } catch {
      Alert.alert("Network Error", "Could not connect to server to enroll student.");
    } finally {
      setIsEnrolling(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = (studentId: number, studentName: string) => {
    Alert.alert(
      "Remove Student",
      `Are you sure you want to delete ${studentName}? This action is permanent.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${apiUrl}/students/${studentId}`, {
                method: "DELETE",
              });
              if (res.ok) {
                Alert.alert("Deleted", "Student was deleted successfully.");
                fetchStudents();
              } else {
                Alert.alert("Failed", "Failed to delete student from database.");
              }
            } catch {
              Alert.alert("Error", "Could not reach server.");
            }
          },
        },
      ]
    );
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    try {
      // Map attendanceRecords boolean map to "Present"/"Absent" values matching web server schema
      const mappedRecords: Record<number, string> = {};
      
      // We filter students matching the active branch & batch to save records
      const relevantStudents = getFilteredStudentsForAttendance();
      
      relevantStudents.forEach((student) => {
        mappedRecords[student.id] = attendanceRecords[student.id] ? "Present" : "Absent";
      });

      const res = await fetch(`${apiUrl}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedAttendanceDate,
          records: mappedRecords,
        }),
      });

      if (res.ok) {
        Alert.alert("Saved", `Attendance for ${selectedAttendanceDate} saved successfully.`);
      } else {
        Alert.alert("Failed", "Unable to save attendance logs.");
      }
    } catch {
      Alert.alert("Error", "Failed to contact backend server.");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Helper selectors
  const getFilteredStudentsForDashboard = () => {
    return students.filter((student) => {
      const matchSearch =
        student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.phone.includes(studentSearch);

      const matchBranch =
        selectedBranchFilter === "All" ||
        student.branch.toLowerCase() === selectedBranchFilter.toLowerCase();

      return matchSearch && matchBranch;
    });
  };

  const getFilteredStudentsForAttendance = () => {
    return students.filter((student) => {
      const matchBranch =
        student.branch.toLowerCase() === attendanceBranch.toLowerCase();

      // Batch can match standard ID or display string
      const matchBatch =
        attendanceBatch === "admin" ||
        student.batch.toLowerCase().includes(attendanceBatch.toLowerCase()) ||
        (attendanceBatch === "batch1" && student.batch.toLowerCase().includes("batch 1")) ||
        (attendanceBatch === "batch2" && student.batch.toLowerCase().includes("batch 2")) ||
        (attendanceBatch === "batch3" && student.batch.toLowerCase().includes("batch 3"));

      return matchBranch && matchBatch;
    });
  };

  // Belt Colors Styling Helper
  const getBeltStyle = (belt: string) => {
    const b = belt.toLowerCase();
    switch (b) {
      case "yellow":
        return { bg: "#FEF08A", text: "#854D0E" };
      case "orange":
        return { bg: "#FFEDD5", text: "#C2410C" };
      case "green":
        return { bg: "#DCFCE7", text: "#15803D" };
      case "blue":
        return { bg: "#DBEAFE", text: "#1D4ED8" };
      case "purple":
        return { bg: "#F3E8FF", text: "#7E22CE" };
      case "brown":
        return { bg: "#FEF3C7", text: "#78350F" };
      case "black":
        return { bg: "#1E293B", text: "#F8FAFC" };
      default: // White
        return { bg: "#F1F5F9", text: "#475569" };
    }
  };

  // Helper dropdown modals trigger
  const openCustomPicker = (
    type: "branch" | "batch" | "belt",
    options: { id: string; name: string }[],
    callback: (val: string) => void
  ) => {
    setPickerType(type);
    setPickerOptions(options);
    setPickerCallback(() => callback);
  };

  const selectPickerItem = (val: string) => {
    if (pickerCallback) pickerCallback(val);
    setPickerType(null);
    setPickerOptions([]);
    setPickerCallback(null);
  };

  // Render Login Card Overlay
  const renderLoginScreen = () => {
    return (
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=2069&auto=format&fit=crop",
        }}
        style={styles.backgroundImage}
      >
        <View style={styles.darkOverlay} />
        <SafeAreaView style={styles.loginContainer}>
          <StatusBar style="light" />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.loginScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Brand Header */}
              <View style={styles.brandContainer}>
                <Text style={styles.brandText}>
                  <Text style={styles.brandAccent}>MASTER</Text> FIT
                </Text>
                <Text style={styles.brandSubText}>Branch & Batch Portal</Text>
              </View>

              {/* Login Modal Box */}
              <View style={styles.loginCard}>
                {/* Form Type Selectors */}
                <View style={styles.loginTypeTabs}>
                  <TouchableOpacity
                    style={[
                      styles.loginTabButton,
                      loginType === "coordinator" && styles.loginTabButtonActive,
                    ]}
                    onPress={() => setLoginType("coordinator")}
                  >
                    <Text
                      style={[
                        styles.loginTabButtonText,
                        loginType === "coordinator" && styles.loginTabButtonTextActive,
                      ]}
                    >
                      Coordinator
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.loginTabButton,
                      loginType === "superadmin" && styles.loginTabButtonActive,
                    ]}
                    onPress={() => setLoginType("superadmin")}
                  >
                    <Text
                      style={[
                        styles.loginTabButtonText,
                        loginType === "superadmin" && styles.loginTabButtonTextActive,
                      ]}
                    >
                      Super Admin
                    </Text>
                  </TouchableOpacity>
                </View>

                {isForgotPassword ? (
                  <View style={styles.forgotPassContainer}>
                    <Text style={styles.forgotTitle}>Password Reset</Text>
                    <Text style={styles.forgotDescription}>
                      If you forgot your password, please contact the administrator via WhatsApp to
                      retrieve or update it.
                    </Text>
                    <TouchableOpacity
                      style={styles.whatsappButton}
                      onPress={() => {
                        const batchName =
                          selectedBatchLogin === "admin"
                            ? "Branch Admin"
                            : batchOptions.find((b) => b.id === selectedBatchLogin)?.name ||
                              selectedBatchLogin;
                        const msgText = `Hi, I need to reset my password for the MASTER FIT dashboard. Branch: ${selectedBranchLogin}, Batch: ${batchName}.`;
                        const url = `https://wa.me/919567964340?text=${encodeURIComponent(msgText)}`;
                        Linking.openURL(url).catch(() => {
                          Alert.alert("Error", "Could not open WhatsApp.");
                        });
                      }}
                    >
                      <MessageCircle size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.whatsappButtonText}>Contact via WhatsApp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.backToLoginBtn}
                      onPress={() => setIsForgotPassword(false)}
                    >
                      <Text style={styles.backToLoginText}>Back to Login</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.formContent}>
                    {loginType === "coordinator" && (
                      <>
                        {/* Branch Dropdown selector */}
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Select Branch</Text>
                          <TouchableOpacity
                            style={styles.pickerTrigger}
                            onPress={() =>
                              openCustomPicker(
                                "branch",
                                branches.map((b) => ({ id: b, name: b })),
                                setSelectedBranchLogin
                              )
                            }
                          >
                            <Text style={styles.pickerTriggerText}>{selectedBranchLogin}</Text>
                            <ChevronDown size={18} color="#B0B0B0" />
                          </TouchableOpacity>
                        </View>

                        {/* Batch Dropdown Selector */}
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Select Batch</Text>
                          <TouchableOpacity
                            style={styles.pickerTrigger}
                            onPress={() =>
                              openCustomPicker(
                                "batch",
                                [
                                  { id: "admin", name: "Branch Admin (All Batches)" },
                                  ...batchOptions.map((b) => ({ id: b.id, name: b.name })),
                                ],
                                setSelectedBatchLogin
                              )
                            }
                          >
                            <Text style={styles.pickerTriggerText}>
                              {selectedBatchLogin === "admin"
                                ? "Branch Admin (All Batches)"
                                : batchOptions.find((b) => b.id === selectedBatchLogin)?.name ||
                                  selectedBatchLogin}
                            </Text>
                            <ChevronDown size={18} color="#B0B0B0" />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}

                    {/* Username Input */}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Username</Text>
                      <View style={styles.inputWrapper}>
                        <User size={18} color="#B0B0B0" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter username"
                          placeholderTextColor="#555555"
                          value={username}
                          onChangeText={setUsername}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.formGroup}>
                      <View style={styles.passwordHeader}>
                        <Text style={styles.label}>Password</Text>
                        <TouchableOpacity onPress={() => setIsForgotPassword(true)}>
                          <Text style={styles.forgotLink}>Forgot?</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.inputWrapper}>
                        <Lock size={18} color="#B0B0B0" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter password"
                          placeholderTextColor="#555555"
                          secureTextEntry
                          value={password}
                          onChangeText={setPassword}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                      style={styles.loginBtn}
                      onPress={handleLogin}
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.loginBtnText}>Login to Dashboard</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    );
  };

  // Render Authenticated Dashboard Screen
  const renderDashboardScreen = () => {
    return (
      <SafeAreaView style={styles.dashboardContainerScreen}>
        <StatusBar style="light" />

        {/* Dashboard Top Header */}
        <View style={styles.dashHeader}>
          <View>
            <Text style={styles.dashHeaderTitle}>
              <Text style={styles.brandAccent}>MASTER</Text> FIT
            </Text>
            <Text style={styles.dashHeaderSubtitle}>
              Logged as: <Text style={{ color: "#FFD700" }}>{loggedInUser}</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color="#E50914" />
          </TouchableOpacity>
        </View>

        {/* Tab Content Rendering */}
        <View style={styles.dashBody}>
          {activeTab === "students" && (
            <View style={styles.tabContentContainer}>
              {/* Search & Filter row */}
              <View style={styles.searchFilterRow}>
                <View style={styles.searchBarWrapper}>
                  <Search size={16} color="#B0B0B0" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchText}
                    placeholder="Search name or phone..."
                    placeholderTextColor="#555555"
                    value={studentSearch}
                    onChangeText={setStudentSearch}
                  />
                </View>

                {loginType === "superadmin" && (
                  <TouchableOpacity
                    style={styles.branchFilterDropdown}
                    onPress={() =>
                      openCustomPicker(
                        "branch",
                        [{ id: "All", name: "All Branches" }, ...branches.map((b) => ({ id: b, name: b }))],
                        setSelectedBranchFilter
                      )
                    }
                  >
                    <Text style={styles.branchFilterText} numberOfLines={1}>
                      {selectedBranchFilter}
                    </Text>
                    <ChevronDown size={14} color="#B0B0B0" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Students List */}
              {isLoadingData ? (
                <View style={styles.centered}>
                  <ActivityIndicator color="#E50914" size="large" />
                </View>
              ) : (
                <FlatList
                  data={getFilteredStudentsForDashboard()}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 80 }}
                  ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                      <Users size={40} color="#555555" />
                      <Text style={styles.emptyText}>No students found.</Text>
                    </View>
                  )}
                  renderItem={({ item }) => {
                    const beltColors = getBeltStyle(item.belt);
                    return (
                      <View style={styles.studentCard}>
                        <View style={styles.studentCardHeader}>
                          <View>
                            <Text style={styles.studentName}>{item.name}</Text>
                            <Text style={styles.studentSubText}>ID: {item.id} • Age: {item.age}</Text>
                          </View>
                          <View
                            style={[
                              styles.beltBadge,
                              { backgroundColor: beltColors.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.beltBadgeText,
                                { color: beltColors.text },
                              ]}
                            >
                              {item.belt}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.studentCardDetail}>
                          <View style={styles.detailItem}>
                            <MapPin size={14} color="#B0B0B0" style={{ marginRight: 4 }} />
                            <Text style={styles.detailText}>{item.branch}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Activity size={14} color="#B0B0B0" style={{ marginRight: 4 }} />
                            <Text style={styles.detailText} numberOfLines={1}>{item.batch}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Phone size={14} color="#B0B0B0" style={{ marginRight: 4 }} />
                            <Text style={styles.detailText}>{item.phone}</Text>
                          </View>
                        </View>

                        {/* Actions row */}
                        <View style={styles.studentActions}>
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteStudent(item.id, item.name)}
                          >
                            <Trash2 size={16} color="#E50914" style={{ marginRight: 4 }} />
                            <Text style={styles.deleteBtnText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
              )}

              {/* Floating Action Button (Enroll) */}
              <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                  setEnrollBranch(
                    loginType === "coordinator" ? selectedBranchLogin : branches[0] || "Kuttiady"
                  );
                  setShowEnrollModal(true);
                }}
              >
                <Plus size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {activeTab === "attendance" && (
            <View style={styles.tabContentContainer}>
              {/* Selector configurations */}
              <View style={styles.attendanceConfigHeader}>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.smallLabel}>Date</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#555555"
                    value={selectedAttendanceDate}
                    onChangeText={setSelectedAttendanceDate}
                  />
                </View>

                {loginType === "superadmin" && (
                  <View style={styles.formGroupHalf}>
                    <Text style={styles.smallLabel}>Branch</Text>
                    <TouchableOpacity
                      style={styles.smallPicker}
                      onPress={() =>
                        openCustomPicker(
                          "branch",
                          branches.map((b) => ({ id: b, name: b })),
                          setAttendanceBranch
                        )
                      }
                    >
                      <Text style={styles.smallPickerText} numberOfLines={1}>
                        {attendanceBranch}
                      </Text>
                      <ChevronDown size={12} color="#B0B0B0" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Batch list row */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.batchOptionsRow}
                contentContainerStyle={{ paddingHorizontal: 12 }}
              >
                {batchOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.batchPill,
                      attendanceBatch === opt.id && styles.batchPillActive,
                    ]}
                    onPress={() => setAttendanceBatch(opt.id)}
                  >
                    <Text
                      style={[
                        styles.batchPillText,
                        attendanceBatch === opt.id && styles.batchPillTextActive,
                      ]}
                    >
                      {opt.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Attendance Students selection List */}
              <FlatList
                data={getFilteredStudentsForAttendance()}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 90 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Users size={40} color="#555555" />
                    <Text style={styles.emptyText}>No students for selected batch.</Text>
                  </View>
                )}
                renderItem={({ item }) => {
                  const isChecked = !!attendanceRecords[item.id];
                  return (
                    <TouchableOpacity
                      style={[
                        styles.attendanceSelectCard,
                        isChecked && styles.attendanceSelectCardChecked,
                      ]}
                      onPress={() => {
                        setAttendanceRecords({
                          ...attendanceRecords,
                          [item.id]: !isChecked,
                        });
                      }}
                    >
                      <View>
                        <Text style={styles.attendanceStudentName}>{item.name}</Text>
                        <Text style={styles.attendanceStudentSub}>ID: {item.id} • Belt: {item.belt}</Text>
                      </View>
                      <View
                        style={[
                          styles.checkboxCircle,
                          isChecked && styles.checkboxCircleChecked,
                        ]}
                      >
                        {isChecked && <Check size={14} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Save Button */}
              {getFilteredStudentsForAttendance().length > 0 && (
                <View style={styles.bottomSaveWrapper}>
                  <TouchableOpacity
                    style={styles.attendanceSaveButton}
                    onPress={handleSaveAttendance}
                    disabled={isSavingAttendance}
                  >
                    {isSavingAttendance ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.attendanceSaveButtonText}>Save Daily Attendance</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {activeTab === "fees" && (
            <ScrollView style={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.panelCard}>
                <Text style={styles.panelTitle}>Fees Dashboard</Text>
                <Text style={styles.panelDesc}>Overview of admissions and monthly rate logs.</Text>

                <View style={styles.feeStatsRow}>
                  <View style={styles.feeStatCell}>
                    <Text style={styles.feeStatValue}>₹1,000</Text>
                    <Text style={styles.feeStatLabel}>Monthly Fee Rate</Text>
                  </View>
                  <View style={styles.feeStatCell}>
                    <Text style={styles.feeStatValue}>₹2,000</Text>
                    <Text style={styles.feeStatLabel}>Admission Fee Rate</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionHeader}>Payments List</Text>
              {students
                .filter(
                  (s) =>
                    selectedBranchFilter === "All" ||
                    s.branch.toLowerCase() === selectedBranchFilter.toLowerCase()
                )
                .map((student) => {
                  const currentMonthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
                  const isPaid = student.paidMonths && !!student.paidMonths[currentMonthKey];

                  return (
                    <View key={student.id} style={styles.feeStudentRow}>
                      <View>
                        <Text style={styles.feeStudentName}>{student.name}</Text>
                        <Text style={styles.feeStudentBranch}>
                          {student.branch} • ID: {student.id}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.feeStatusBadge,
                          isPaid ? styles.feeStatusBadgePaid : styles.feeStatusBadgeUnpaid,
                        ]}
                        onPress={async () => {
                          // Toggle paid month status on server
                          const updatedPaidMonths = { ...(student.paidMonths || {}) };
                          updatedPaidMonths[currentMonthKey] = !isPaid;

                          try {
                            const res = await fetch(`${apiUrl}/students/${student.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ paidMonths: updatedPaidMonths }),
                            });
                            if (res.ok) {
                              fetchStudents();
                            }
                          } catch {
                            Alert.alert("Error", "Could not toggle payment status.");
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.feeStatusBadgeText,
                            isPaid ? styles.feeStatusBadgeTextPaid : styles.feeStatusBadgeTextUnpaid,
                          ]}
                        >
                          {isPaid ? "Paid" : "Pending"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}

          {activeTab === "settings" && (
            <ScrollView style={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.panelCard}>
                <Text style={styles.panelTitle}>System Settings</Text>
                <Text style={styles.panelDesc}>Manage branch credentials and view session info.</Text>
              </View>

              <View style={styles.settingsGroup}>
                <Text style={styles.settingsGroupLabel}>Session Information</Text>
                <View style={styles.sessionCard}>
                  <Text style={styles.sessionText}>
                    Active Account: <Text style={{ color: "#E50914" }}>{loggedInUser}</Text>
                  </Text>
                  <Text style={styles.sessionText}>
                    Auth Mode: <Text style={{ color: "#FFD700" }}>{loginType}</Text>
                  </Text>
                </View>
              </View>

              {/* Administrative options rendered if Super Admin */}
              {!loggedInUser?.includes("@") && (
                <View style={{ gap: 16, marginTop: 12, marginBottom: 20 }}>
                  <Text style={styles.sectionHeader}>Administrative Options</Text>

                  {/* 1. Manage Branch Credentials */}
                  <View style={styles.accordionContainer}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => setExpandedSection(expandedSection === "branchCreds" ? null : "branchCreds")}
                    >
                      <Text style={styles.accordionTitle}>Manage Branch Credentials</Text>
                      <ChevronDown size={18} color="#FFFFFF" style={{ transform: [{ rotate: expandedSection === "branchCreds" ? "180deg" : "0deg" }] }} />
                    </TouchableOpacity>
                    {expandedSection === "branchCreds" && (
                      <View style={styles.accordionContent}>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>Select Branch</Text>
                          <TouchableOpacity
                            style={styles.enrollPickerTrigger}
                            onPress={() =>
                              openCustomPicker(
                                "branch",
                                branches.map((b) => ({ id: b, name: b })),
                                (val) => setBranchForm({ ...branchForm, branch: val })
                              )
                            }
                          >
                            <Text style={styles.enrollPickerTriggerText}>{branchForm.branch}</Text>
                            <ChevronDown size={16} color="#B0B0B0" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>New Username (Optional)</Text>
                          <TextInput
                            style={styles.enrollInput}
                            placeholder={`admin@${branchForm.branch}`}
                            placeholderTextColor="#555555"
                            value={branchForm.newUsername}
                            onChangeText={(val) => setBranchForm({ ...branchForm, newUsername: val })}
                          />
                        </View>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>New Password</Text>
                          <TextInput
                            style={styles.enrollInput}
                            placeholder="Enter new password"
                            placeholderTextColor="#555555"
                            secureTextEntry
                            value={branchForm.newPassword}
                            onChangeText={(val) => setBranchForm({ ...branchForm, newPassword: val })}
                          />
                        </View>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>Confirm Password</Text>
                          <TextInput
                            style={styles.enrollInput}
                            placeholder="Confirm new password"
                            placeholderTextColor="#555555"
                            secureTextEntry
                            value={branchForm.confirmPassword}
                            onChangeText={(val) => setBranchForm({ ...branchForm, confirmPassword: val })}
                          />
                        </View>
                        <TouchableOpacity style={styles.enrollSaveButton} onPress={handleUpdateBranchPassword}>
                          <Text style={styles.enrollSaveButtonText}>Save Branch Credentials</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* 2. Manage Batch Credentials */}
                  <View style={styles.accordionContainer}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => setExpandedSection(expandedSection === "batchCreds" ? null : "batchCreds")}
                    >
                      <Text style={styles.accordionTitle}>Manage Batch Credentials</Text>
                      <ChevronDown size={18} color="#FFFFFF" style={{ transform: [{ rotate: expandedSection === "batchCreds" ? "180deg" : "0deg" }] }} />
                    </TouchableOpacity>
                    {expandedSection === "batchCreds" && (
                      <View style={styles.accordionContent}>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>Select Branch</Text>
                          <TouchableOpacity
                            style={styles.enrollPickerTrigger}
                            onPress={() =>
                              openCustomPicker(
                                "branch",
                                branches.map((b) => ({ id: b, name: b })),
                                (val) => setBatchForm({ ...batchForm, branch: val })
                              )
                            }
                          >
                            <Text style={styles.enrollPickerTriggerText}>{batchForm.branch}</Text>
                            <ChevronDown size={16} color="#B0B0B0" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>Select Batch</Text>
                          <TouchableOpacity
                            style={styles.enrollPickerTrigger}
                            onPress={() =>
                              openCustomPicker(
                                "batch",
                                batchOptions.map((b) => ({ id: b.id, name: b.name })),
                                (val) => setBatchForm({ ...batchForm, batch: val })
                              )
                            }
                          >
                            <Text style={styles.enrollPickerTriggerText}>
                              {batchOptions.find(b => b.id === batchForm.batch)?.name || batchForm.batch}
                            </Text>
                            <ChevronDown size={16} color="#B0B0B0" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>New Username (Optional)</Text>
                          <TextInput
                            style={styles.enrollInput}
                            placeholder={`${batchForm.batch}@${batchForm.branch}`}
                            placeholderTextColor="#555555"
                            value={batchForm.newUsername}
                            onChangeText={(val) => setBatchForm({ ...batchForm, newUsername: val })}
                          />
                        </View>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>New Password</Text>
                          <TextInput
                            style={styles.enrollInput}
                            placeholder="Enter new password"
                            placeholderTextColor="#555555"
                            secureTextEntry
                            value={batchForm.newPassword}
                            onChangeText={(val) => setBatchForm({ ...batchForm, newPassword: val })}
                          />
                        </View>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>Confirm Password</Text>
                          <TextInput
                            style={styles.enrollInput}
                            placeholder="Confirm new password"
                            placeholderTextColor="#555555"
                            secureTextEntry
                            value={batchForm.confirmPassword}
                            onChangeText={(val) => setBatchForm({ ...batchForm, confirmPassword: val })}
                          />
                        </View>
                        <TouchableOpacity style={styles.enrollSaveButton} onPress={handleUpdateBatchPassword}>
                          <Text style={styles.enrollSaveButtonText}>Save Batch Credentials</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* 3. Add & Manage Branches */}
                  <View style={styles.accordionContainer}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => setExpandedSection(expandedSection === "addBranch" ? null : "addBranch")}
                    >
                      <Text style={styles.accordionTitle}>Add & Manage Branches</Text>
                      <ChevronDown size={18} color="#FFFFFF" style={{ transform: [{ rotate: expandedSection === "addBranch" ? "180deg" : "0deg" }] }} />
                    </TouchableOpacity>
                    {expandedSection === "addBranch" && (
                      <View style={styles.accordionContent}>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>Branch Name</Text>
                          <TextInput
                            style={styles.enrollInput}
                            placeholder="e.g. Vatakara"
                            placeholderTextColor="#555555"
                            value={newBranchForm.name}
                            onChangeText={(val) => setNewBranchForm({ ...newBranchForm, name: val })}
                          />
                        </View>
                        <View style={styles.enrollFormGroup}>
                          <Text style={styles.enrollFormLabel}>Username (Optional)</Text>
                          <TextInput
                            style={styles.enrollInput}
                            placeholder="e.g. admin@vatakara"
                            placeholderTextColor="#555555"
                            value={newBranchForm.username}
                            onChangeText={(val) => setNewBranchForm({ ...newBranchForm, username: val })}
                          />
                        </View>
                        <View style={styles.formRow}>
                          <View style={styles.formRowHalf}>
                            <Text style={styles.enrollFormLabel}>Password</Text>
                            <TextInput
                              style={styles.enrollInput}
                              placeholder="Enter password"
                              placeholderTextColor="#555555"
                              secureTextEntry
                              value={newBranchForm.password}
                              onChangeText={(val) => setNewBranchForm({ ...newBranchForm, password: val })}
                            />
                          </View>
                          <View style={styles.formRowHalf}>
                            <Text style={styles.enrollFormLabel}>Confirm</Text>
                            <TextInput
                              style={styles.enrollInput}
                              placeholder="Confirm password"
                              placeholderTextColor="#555555"
                              secureTextEntry
                              value={newBranchForm.confirmPassword}
                              onChangeText={(val) => setNewBranchForm({ ...newBranchForm, confirmPassword: val })}
                            />
                          </View>
                        </View>
                        <TouchableOpacity style={styles.enrollSaveButton} onPress={handleAddCustomBranch}>
                          <Text style={styles.enrollSaveButtonText}>Create Branch & Credentials</Text>
                        </TouchableOpacity>

                        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Custom Branches List</Text>
                        {customBranches.length === 0 ? (
                          <Text style={styles.emptyText}>No custom branches added yet.</Text>
                        ) : (
                          customBranches.map((brName) => (
                            <View key={brName} style={styles.adminListRow}>
                              <Text style={styles.adminListText}>{brName}</Text>
                              <TouchableOpacity
                                style={styles.adminListDeleteBtn}
                                onPress={() => handleDeleteCustomBranch(brName)}
                              >
                                <Trash2 size={16} color="#E50914" />
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>

                  {/* 4. Add & Manage Batches */}
                  <View style={styles.accordionContainer}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => setExpandedSection(expandedSection === "addBatch" ? null : "addBatch")}
                    >
                      <Text style={styles.accordionTitle}>Add & Manage Batches</Text>
                      <ChevronDown size={18} color="#FFFFFF" style={{ transform: [{ rotate: expandedSection === "addBatch" ? "180deg" : "0deg" }] }} />
                    </TouchableOpacity>
                    {expandedSection === "addBatch" && (
                      <View style={styles.accordionContent}>
                        <View style={styles.formRow}>
                          <View style={styles.formRowHalf}>
                            <Text style={styles.enrollFormLabel}>Batch Name</Text>
                            <TextInput
                              style={styles.enrollInput}
                              placeholder="e.g. Batch 4"
                              placeholderTextColor="#555555"
                              value={newBatchForm.name}
                              onChangeText={(val) => setNewBatchForm({ ...newBatchForm, name: val })}
                            />
                          </View>
                          <View style={styles.formRowHalf}>
                            <Text style={styles.enrollFormLabel}>Schedule</Text>
                            <TextInput
                              style={styles.enrollInput}
                              placeholder="e.g. Sat-Sun"
                              placeholderTextColor="#555555"
                              value={newBatchForm.schedule}
                              onChangeText={(val) => setNewBatchForm({ ...newBatchForm, schedule: val })}
                            />
                          </View>
                        </View>
                        <View style={styles.formRow}>
                          <View style={styles.formRowHalf}>
                            <Text style={styles.enrollFormLabel}>Branch</Text>
                            <TouchableOpacity
                              style={styles.enrollPickerTrigger}
                              onPress={() =>
                                openCustomPicker(
                                  "branch",
                                  branches.map((b) => ({ id: b, name: b })),
                                  (val) => setNewBatchForm({ ...newBatchForm, branch: val })
                                )
                              }
                            >
                              <Text style={styles.enrollPickerTriggerText} numberOfLines={1}>
                                {newBatchForm.branch}
                              </Text>
                              <ChevronDown size={16} color="#B0B0B0" />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.formRowHalf}>
                            <Text style={styles.enrollFormLabel}>Username (Optional)</Text>
                            <TextInput
                              style={styles.enrollInput}
                              placeholder="Coordinator username"
                              placeholderTextColor="#555555"
                              value={newBatchForm.username}
                              onChangeText={(val) => setNewBatchForm({ ...newBatchForm, username: val })}
                            />
                          </View>
                        </View>
                        <View style={styles.formRow}>
                          <View style={styles.formRowHalf}>
                            <Text style={styles.enrollFormLabel}>Password</Text>
                            <TextInput
                              style={styles.enrollInput}
                              placeholder="Enter password"
                              placeholderTextColor="#555555"
                              secureTextEntry
                              value={newBatchForm.password}
                              onChangeText={(val) => setNewBatchForm({ ...newBatchForm, password: val })}
                            />
                          </View>
                          <View style={styles.formRowHalf}>
                            <Text style={styles.enrollFormLabel}>Confirm</Text>
                            <TextInput
                              style={styles.enrollInput}
                              placeholder="Confirm password"
                              placeholderTextColor="#555555"
                              secureTextEntry
                              value={newBatchForm.confirmPassword}
                              onChangeText={(val) => setNewBatchForm({ ...newBatchForm, confirmPassword: val })}
                            />
                          </View>
                        </View>
                        <TouchableOpacity style={styles.enrollSaveButton} onPress={handleAddCustomBatch}>
                          <Text style={styles.enrollSaveButtonText}>Create Batch & Credentials</Text>
                        </TouchableOpacity>

                        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Custom Batches List</Text>
                        {customBatches.length === 0 ? (
                          <Text style={styles.emptyText}>No custom batches added yet.</Text>
                        ) : (
                          customBatches.map((bt) => (
                            <View key={bt.id} style={styles.adminListRow}>
                              <View>
                                <Text style={styles.adminListText}>{bt.name}</Text>
                                <Text style={styles.adminListSubText}>Schedule: {bt.schedule}</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.adminListDeleteBtn}
                                onPress={() => handleDeleteCustomBatch(bt.id, bt.name)}
                              >
                                <Trash2 size={16} color="#E50914" />
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.logoutLargeBtn} onPress={handleLogout}>
                <LogOut size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.logoutLargeBtnText}>Disconnect and Log Out</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Dashboard Bottom Navigation Bar */}
        <View style={styles.dashTabs}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "students" && styles.tabButtonActive]}
            onPress={() => setActiveTab("students")}
          >
            <Users size={20} color={activeTab === "students" ? "#E50914" : "#B0B0B0"} />
            <Text style={[styles.tabText, activeTab === "students" && styles.tabTextActive]}>
              Students
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "attendance" && styles.tabButtonActive]}
            onPress={() => setActiveTab("attendance")}
          >
            <Calendar size={20} color={activeTab === "attendance" ? "#E50914" : "#B0B0B0"} />
            <Text style={[styles.tabText, activeTab === "attendance" && styles.tabTextActive]}>
              Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "fees" && styles.tabButtonActive]}
            onPress={() => setActiveTab("fees")}
          >
            <CreditCard size={20} color={activeTab === "fees" ? "#E50914" : "#B0B0B0"} />
            <Text style={[styles.tabText, activeTab === "fees" && styles.tabTextActive]}>Fees</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "settings" && styles.tabButtonActive]}
            onPress={() => setActiveTab("settings")}
          >
            <Settings size={20} color={activeTab === "settings" ? "#E50914" : "#B0B0B0"} />
            <Text style={[styles.tabText, activeTab === "settings" && styles.tabTextActive]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  return (
    <View style={styles.appContainer}>
      {isLoggedIn ? renderDashboardScreen() : renderLoginScreen()}

      {/* Dynamic Selector Options Custom Modal Picker */}
      {pickerType !== null && (
        <Modal transparent visible={pickerType !== null} animationType="fade">
          <Pressable style={styles.pickerOverlay} onPress={() => setPickerType(null)}>
            <View style={styles.pickerContentContainer}>
              <View style={styles.pickerHeaderRow}>
                <Text style={styles.pickerTitle}>Select {pickerType}</Text>
                <TouchableOpacity onPress={() => setPickerType(null)}>
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={pickerOptions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => selectPickerItem(item.id)}
                  >
                    <Text style={styles.pickerItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </Pressable>
        </Modal>
      )}



      {/* Enroll Student Form Modal */}
      <Modal transparent visible={showEnrollModal} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.enrollOverlay}
        >
          <View style={styles.enrollModalContent}>
            <View style={styles.enrollHeader}>
              <Text style={styles.enrollTitle}>Enroll New Student</Text>
              <TouchableOpacity onPress={() => setShowEnrollModal(false)}>
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.enrollFormScroll}>
              {/* Name field */}
              <View style={styles.enrollFormGroup}>
                <Text style={styles.enrollFormLabel}>Student Full Name</Text>
                <TextInput
                  style={styles.enrollInput}
                  placeholder="Enter full name"
                  placeholderTextColor="#555555"
                  value={enrollName}
                  onChangeText={setEnrollName}
                />
              </View>

              {/* Age & Phone Row */}
              <View style={styles.formRow}>
                <View style={styles.formRowHalf}>
                  <Text style={styles.enrollFormLabel}>Age</Text>
                  <TextInput
                    style={styles.enrollInput}
                    placeholder="e.g. 15"
                    placeholderTextColor="#555555"
                    keyboardType="number-pad"
                    value={enrollAge}
                    onChangeText={setEnrollAge}
                  />
                </View>
                <View style={styles.formRowHalf}>
                  <Text style={styles.enrollFormLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.enrollInput}
                    placeholder="Enter 10 digit phone"
                    placeholderTextColor="#555555"
                    keyboardType="phone-pad"
                    value={enrollPhone}
                    onChangeText={setEnrollPhone}
                  />
                </View>
              </View>

              {/* Belt Picker */}
              <View style={styles.enrollFormGroup}>
                <Text style={styles.enrollFormLabel}>Belt Rank Color</Text>
                <TouchableOpacity
                  style={styles.enrollPickerTrigger}
                  onPress={() =>
                    openCustomPicker(
                      "belt",
                      [
                        { id: "White", name: "White" },
                        { id: "Yellow", name: "Yellow" },
                        { id: "Orange", name: "Orange" },
                        { id: "Green", name: "Green" },
                        { id: "Blue", name: "Blue" },
                        { id: "Purple", name: "Purple" },
                        { id: "Brown", name: "Brown" },
                        { id: "Black", name: "Black" },
                      ],
                      setEnrollBelt
                    )
                  }
                >
                  <Text style={styles.enrollPickerTriggerText}>{enrollBelt}</Text>
                  <ChevronDown size={18} color="#B0B0B0" />
                </TouchableOpacity>
              </View>

              {/* Batch & Schedule Picker */}
              <View style={styles.enrollFormGroup}>
                <Text style={styles.enrollFormLabel}>Select Batch</Text>
                <TouchableOpacity
                  style={styles.enrollPickerTrigger}
                  onPress={() =>
                    openCustomPicker(
                      "batch",
                      batchOptions.map((b) => ({ id: b.name, name: b.name })),
                      (val) => {
                        setEnrollBatch(val);
                        // Extract schedule from selected batch if possible
                        const match = batchOptions.find((b) => b.name === val);
                        if (match) setEnrollSchedule(match.schedule);
                      }
                    )
                  }
                >
                  <Text style={styles.enrollPickerTriggerText}>{enrollBatch}</Text>
                  <ChevronDown size={18} color="#B0B0B0" />
                </TouchableOpacity>
              </View>

              {/* Branch Picker (Super Admin only - Locked if coordinator) */}
              <View style={styles.enrollFormGroup}>
                <Text style={styles.enrollFormLabel}>Branch Allocation</Text>
                {loginType === "superadmin" ? (
                  <TouchableOpacity
                    style={styles.enrollPickerTrigger}
                    onPress={() =>
                      openCustomPicker(
                        "branch",
                        branches.map((b) => ({ id: b, name: b })),
                        setEnrollBranch
                      )
                    }
                  >
                    <Text style={styles.enrollPickerTriggerText}>{enrollBranch}</Text>
                    <ChevronDown size={18} color="#B0B0B0" />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.enrollInput, styles.enrollInputDisabled]}>
                    <Text style={styles.disabledInputText}>{enrollBranch}</Text>
                  </View>
                )}
              </View>

              {/* Save Student Button */}
              <TouchableOpacity
                style={styles.enrollSaveButton}
                onPress={handleEnrollStudent}
                disabled={isEnrolling}
              >
                {isEnrolling ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.enrollSaveButtonText}>Register Student</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: "#050505",
  },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
  },
  darkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(5, 5, 5, 0.85)", // Heavy dark overlay matching web app
  },
  loginContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  configBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  brandText: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  brandAccent: {
    color: "#E50914", // MASTER FIT Red
  },
  brandSubText: {
    fontSize: 12,
    color: "#B0B0B0",
    fontWeight: "600",
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: "uppercase",
  },
  loginCard: {
    backgroundColor: "rgba(20, 20, 20, 0.7)", // Glass style card
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.37,
    shadowRadius: 32,
    elevation: 8,
  },
  loginTypeTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  loginTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  loginTabButtonActive: {
    backgroundColor: "#E50914",
  },
  loginTabButtonText: {
    color: "#B0B0B0",
    fontWeight: "600",
    fontSize: 14,
  },
  loginTabButtonTextActive: {
    color: "#FFFFFF",
  },
  formContent: {
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    color: "#B0B0B0",
    fontSize: 14,
    fontWeight: "600",
  },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  pickerTriggerText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    height: "100%",
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotLink: {
    color: "#E50914",
    fontSize: 13,
    fontWeight: "600",
  },
  loginBtn: {
    backgroundColor: "#E50914",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#E50914",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  forgotPassContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  forgotTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  forgotDescription: {
    color: "#B0B0B0",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
    justifyContent: "center",
  },
  whatsappButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  backToLoginBtn: {
    padding: 8,
  },
  backToLoginText: {
    color: "#B0B0B0",
    fontSize: 14,
    fontWeight: "600",
  },
  // Custom picker overlay modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 24,
  },
  pickerContentContainer: {
    maxHeight: 400,
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  pickerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pickerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  pickerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  pickerItemText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  // Config endpoint modal
  configModalContent: {
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  configModalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  configForm: {
    marginTop: 12,
    gap: 12,
  },
  configFormLabel: {
    color: "#B0B0B0",
    fontSize: 14,
    fontWeight: "600",
  },
  configInput: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    color: "#FFFFFF",
    fontSize: 14,
  },
  configHelpText: {
    color: "#555555",
    fontSize: 12,
    lineHeight: 16,
  },
  configSaveBtn: {
    backgroundColor: "#E50914",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  configSaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  // Authenticated screen container
  dashboardContainerScreen: {
    flex: 1,
    backgroundColor: "#050505",
  },
  dashHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  dashHeaderTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  dashHeaderSubtitle: {
    fontSize: 12,
    color: "#B0B0B0",
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(229, 9, 20, 0.1)",
  },
  dashBody: {
    flex: 1,
  },
  tabContentContainer: {
    flex: 1,
    padding: 16,
  },
  searchFilterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    height: "100%",
  },
  branchFilterDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    width: 130,
  },
  branchFilterText: {
    color: "#FFFFFF",
    fontSize: 13,
    maxWidth: 90,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    color: "#555555",
    fontSize: 15,
  },
  // Student Card styles
  studentCard: {
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  studentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  studentName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  studentSubText: {
    color: "#B0B0B0",
    fontSize: 12,
    marginTop: 2,
  },
  beltBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  beltBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginVertical: 12,
  },
  studentCardDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    color: "#B0B0B0",
    fontSize: 13,
  },
  studentActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.03)",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  deleteBtnText: {
    color: "#E50914",
    fontSize: 13,
    fontWeight: "600",
  },
  // Floating Action button
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E50914",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#E50914",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  // Dashboard navigation tabs
  dashTabs: {
    flexDirection: "row",
    height: 60,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#0A0A0A",
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  tabButtonActive: {
    borderTopWidth: 2,
    borderTopColor: "#E50914",
  },
  tabText: {
    color: "#B0B0B0",
    fontSize: 10,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#E50914",
    fontWeight: "700",
  },
  // Enroll Modal Screen Overlay Styles
  enrollOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  enrollModalContent: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: "85%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  enrollHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  enrollTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  enrollFormScroll: {
    flex: 1,
  },
  enrollFormGroup: {
    marginBottom: 16,
    gap: 6,
  },
  enrollFormLabel: {
    color: "#B0B0B0",
    fontSize: 14,
    fontWeight: "600",
  },
  enrollInput: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    color: "#FFFFFF",
    fontSize: 15,
    justifyContent: "center",
  },
  enrollInputDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderColor: "rgba(255, 255, 255, 0.03)",
  },
  disabledInputText: {
    color: "#555555",
    fontSize: 15,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  formRowHalf: {
    flex: 1,
    gap: 6,
  },
  enrollPickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  enrollPickerTriggerText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  enrollSaveButton: {
    backgroundColor: "#E50914",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  enrollSaveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  // Attendance config tab styles
  attendanceConfigHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  formGroupHalf: {
    flex: 1,
    gap: 6,
  },
  smallLabel: {
    color: "#B0B0B0",
    fontSize: 12,
    fontWeight: "600",
  },
  smallInput: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 36,
    color: "#FFFFFF",
    fontSize: 13,
  },
  smallPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 36,
  },
  smallPickerText: {
    color: "#FFFFFF",
    fontSize: 13,
    maxWidth: 90,
  },
  batchOptionsRow: {
    maxHeight: 36,
    marginBottom: 16,
  },
  batchPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  batchPillActive: {
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    borderColor: "#E50914",
  },
  batchPillText: {
    color: "#B0B0B0",
    fontSize: 12,
    fontWeight: "600",
  },
  batchPillTextActive: {
    color: "#FFFFFF",
  },
  // Attendance selection list styles
  attendanceSelectCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#141414",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  attendanceSelectCardChecked: {
    borderColor: "rgba(16, 185, 129, 0.3)",
    backgroundColor: "rgba(16, 185, 129, 0.02)",
  },
  attendanceStudentName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  attendanceStudentSub: {
    color: "#B0B0B0",
    fontSize: 12,
    marginTop: 2,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#555555",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCircleChecked: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
  },
  bottomSaveWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#050505",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  attendanceSaveButton: {
    backgroundColor: "#E50914",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  attendanceSaveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  // Fees panels
  panelCard: {
    backgroundColor: "rgba(229, 9, 20, 0.04)",
    borderColor: "rgba(229, 9, 20, 0.15)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  panelDesc: {
    color: "#B0B0B0",
    fontSize: 13,
    marginTop: 4,
  },
  feeStatsRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 16,
  },
  feeStatCell: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
  },
  feeStatValue: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "800",
  },
  feeStatLabel: {
    color: "#B0B0B0",
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  feeStudentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#141414",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  feeStudentName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  feeStudentBranch: {
    color: "#B0B0B0",
    fontSize: 12,
    marginTop: 2,
  },
  feeStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  feeStatusBadgePaid: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  feeStatusBadgeUnpaid: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  feeStatusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  feeStatusBadgeTextPaid: {
    color: "#10B981",
  },
  feeStatusBadgeTextUnpaid: {
    color: "#EF4444",
  },
  // Settings Tab
  settingsGroup: {
    marginBottom: 20,
  },
  settingsGroupLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  settingsInputWrapper: {
    backgroundColor: "#141414",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    height: 48,
    justifyContent: "center",
  },
  settingsInput: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  settingsHelpText: {
    color: "#555555",
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  sessionCard: {
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  sessionText: {
    color: "#B0B0B0",
    fontSize: 14,
  },
  logoutLargeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E50914",
    height: 48,
    borderRadius: 8,
    marginTop: 12,
  },
  logoutLargeBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  accordionContainer: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1A1A1A",
  },
  accordionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  accordionContent: {
    padding: 16,
    gap: 12,
    backgroundColor: "#111111",
  },
  adminListRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#181818",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    marginTop: 8,
  },
  adminListText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  adminListSubText: {
    color: "#B0B0B0",
    fontSize: 12,
    marginTop: 2,
  },
  adminListDeleteBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "rgba(229, 9, 20, 0.1)",
  },
});
