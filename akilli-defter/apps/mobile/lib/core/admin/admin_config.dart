const List<String> adminEmails = [
  'burakozdayi@gmail.com',
];

bool isAdminEmail(String? email) {
  if (email == null || email.trim().isEmpty) return false;
  final normalized = email.trim().toLowerCase();
  return adminEmails.any((value) => value.toLowerCase() == normalized);
}
