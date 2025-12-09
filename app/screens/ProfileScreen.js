import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Button,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, supabase } from '../../firebase/config';
import { ref as dbRef, get, update, remove } from 'firebase/database';
import { signOut, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function ProfileScreen({ navigation }) {

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    pseudo: '',
    phone: '',
    profileImage: '',
  });

  const [uploading, setUploading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  // ----------------------------------------------------
  //   LOAD USER DATA
  // ----------------------------------------------------
  useEffect(() => {
    const userRef = dbRef(db, `users/${auth.currentUser.uid}`);

    get(userRef).then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserData({
          name: data.name || '',
          email: data.email || '',
          pseudo: data.pseudo || '',
          phone: data.phone || '',
          profileImage: data.profileImage || '',
        });
      }
    });
  }, []);

  // ----------------------------------------------------
  //   PICK IMAGE
  // ----------------------------------------------------
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      uploadProfilePicture(imageUri);
    }
  };

  // ----------------------------------------------------
  //   UPLOAD IMAGE TO SUPABASE (FIXED - USING YOUR FRIEND'S METHOD)
  // ----------------------------------------------------
  const uploadImageToSupabase = async (localURL) => {
    try {
      const response = await fetch(localURL);
      const blob = await response.blob();
      const arraybuffer = await new Response(blob).arrayBuffer();
      
      const fileName = `${auth.currentUser.uid}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('les_images_de_profil')
        .upload(fileName, arraybuffer, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('les_images_de_profil')
        .getPublicUrl(fileName);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }
  };

  const uploadProfilePicture = async (imageUri) => {
    setUploading(true);
    try {
      // Upload to Supabase
      const imageUrl = await uploadImageToSupabase(imageUri);
      
      // Update Firebase database with new image URL
      await update(dbRef(db, `users/${auth.currentUser.uid}`), { 
        profileImage: imageUrl 
      });
      
      setUserData({ ...userData, profileImage: imageUrl });
      Alert.alert('Success', 'Profile picture uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ----------------------------------------------------
  //   LOGOUT
  // ----------------------------------------------------
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.reset({ routes: [{ name: "Login" }] });
    } catch (error) {
      Alert.alert("Error", "Failed to logout.");
    }
  };

  // ----------------------------------------------------
  //   EDIT PROFILE
  // ----------------------------------------------------
  const handleEditProfile = async () => {
    try {
      await update(dbRef(db, `users/${auth.currentUser.uid}`), {
        name: userData.name,
        pseudo: userData.pseudo,
        phone: userData.phone,
      });

      Alert.alert("Success", "Profile updated!");
      setIsEditModalVisible(false);

    } catch (err) {
      Alert.alert("Error", "Failed to update profile.");
    }
  };

  // ----------------------------------------------------
  //   DELETE ACCOUNT
  // ----------------------------------------------------
  const confirmDeleteWithPassword = async () => {
    const user = auth.currentUser;

    if (!deletePassword) {
      Alert.alert("Error", "Enter your password.");
      return;
    }

    const credential = EmailAuthProvider.credential(user.email, deletePassword);

    try {
      await reauthenticateWithCredential(user, credential);

      await remove(dbRef(db, `users/${user.uid}`));
      await user.delete();

      Alert.alert("Success", "Account deleted.");
      navigation.reset({ routes: [{ name: "Login" }] });

    } catch (err) {
      Alert.alert("Error", "Incorrect password.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileContainer}>

        {/* PROFILE IMAGE */}
        <TouchableOpacity onPress={pickImage}>
          {userData.profileImage ? (
            <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.uploadButton}>
              <Text style={styles.uploadText}>Upload</Text>
            </View>
          )}
        </TouchableOpacity>

        {uploading && <Text style={styles.uploadingText}>Uploading...</Text>}

        <Text style={styles.profileText}>Name: {userData.name}</Text>
        <Text style={styles.profileText}>Email: {userData.email}</Text>
        <Text style={styles.profileText}>Phone: {userData.phone}</Text>
        <Text style={styles.profileText}>Pseudo: {userData.pseudo}</Text>

        {/* BUTTONS */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditModalVisible(true)}>
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={() => setPasswordModalVisible(true)}>
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButtonInline} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* DELETE MODAL */}
      <Modal visible={passwordModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Account Deletion</Text>

            <TextInput
              secureTextEntry
              placeholder="Enter password"
              style={styles.input}
              value={deletePassword}
              onChangeText={setDeletePassword}
            />

            <View style={styles.modalButtonRow}>
              <Button title="Delete" color="#D32F2F" onPress={confirmDeleteWithPassword} />
              <Button title="Cancel" color="#9E9E9E" onPress={() => setPasswordModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <TextInput style={styles.input} placeholder="Name" value={userData.name}
              onChangeText={(t) => setUserData({ ...userData, name: t })} />

            <TextInput style={styles.input} placeholder="Phone" value={userData.phone}
              onChangeText={(t) => setUserData({ ...userData, phone: t })} />

            <TextInput style={styles.input} placeholder="Pseudo" value={userData.pseudo}
              onChangeText={(t) => setUserData({ ...userData, pseudo: t })} />

            <View style={styles.modalButtonRow}>
              <Button title="Save" color="#4CAF50" onPress={handleEditProfile} />
              <Button title="Cancel" color="#9E9E9E" onPress={() => setIsEditModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}


// --------------------------------------------------------
//                     STYLES
// --------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingTop: 20,
  },
  profileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginTop: 20,
    elevation: 5,
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 15,
  },
  uploadButton: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C8E6C9',
    borderRadius: 65,
    marginBottom: 15,
  },
  uploadText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  uploadingText: {
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 10,
  },
  profileText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#1B5E20',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 20,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 5,
    marginRight: 5,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    padding: 12,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  logoutButtonInline: {
    flex: 1,
    backgroundColor: '#388E3C',
    padding: 12,
    borderRadius: 5,
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#1B5E20',
  },
  input: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});