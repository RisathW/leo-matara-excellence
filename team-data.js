/*
  TEAM DATA: the only file you need to edit to update the team.

  - exec:      the 5 officers shown on the home page and the About page (in this order)
  - board:     the Executive Board, shown on members.html (in this order)
  - directors: the Board of Directors, shown on members.html (in this order)
  - members:   all other Leos, names only, shown on members.html in a simple list (alphabetical)
  - name / role: shown on the card. Only names and designations are published here, never contact details.
  - photo:     path to a square-ish headshot, e.g. "assets/team/nimal.jpg" (leave "" for a silhouette)
  - title:     prefix shown before the name. Leave it out for "Leo" (the default). Use "Lion" for a Lion, or "" for none.
*/
window.TEAM = {
  // how many of the people listed are full members; the rest are shown as prospective members in the count line
  confirmed: 55,
  exec: [
    { title: "Leo", name: "Ramudi Liyanage", role: "President", photo: "assets/team/ramudi.webp", href: "president.html" },
    { name: "Veneesa Sayori Rathnayake", role: "Vice President", photo: "assets/team/veneesa.webp" },
    { name: "Oshini Rathnasinghe", role: "Secretary", photo: "assets/team/oshini.webp" },
    { name: "Sathil Nethmira Punchihewa", role: "Treasurer", photo: "assets/team/sathil.webp" },
    { title: "Lion", name: "Ravindu Runage", role: "Advisor", photo: "assets/team/ravindu.webp", href: "advisor.html" }
  ],
  board: [
    { title: "Lion", name: "Ravindu Runage", role: "Club Advisor", photo: "assets/team/ravindu.webp", href: "advisor.html" },
    { title: "Leo", name: "Ramudi Liyanage", role: "President", photo: "assets/team/ramudi.webp", href: "president.html" },
    { name: "Oshini Rathnasinghe", role: "Secretary", photo: "assets/team/oshini.webp" },
    { name: "Sathil Nethmira Punchihewa", role: "Treasurer", photo: "assets/team/sathil.webp" },
    { name: "Veneesa Sayori Rathnayake", role: "1st Vice President", photo: "assets/team/veneesa.webp" },
    { name: "Gavinu Imajith Kodithuwakku Arachchi", role: "2nd Vice President", photo: "assets/team/gavinu.webp" },
    { name: "Senumi Yuhansa Vithanage", role: "Assistant Secretary", photo: "assets/team/senumi.webp" },
    { name: "Rasali Omalka Ahangama Withanage", role: "Assistant Secretary", photo: "assets/team/rasali.webp" },
    { name: "Polwatta Gallage Sanuk Randeepa", role: "Assistant Treasurer", photo: "assets/team/sanuk.webp" },
    { name: "D.M Chathuni Nuwangi Herath", role: "Chief Coordinator, Multimedia", photo: "assets/team/chathuni.webp" },
    { name: "Nemin Sasmitha Palliyaguruge", role: "Chief Coordinator, Project", photo: "assets/team/nemin.webp" },
    { name: "Paramee Anudima Wijewickrama", role: "Chief Coordinator, Service", photo: "assets/team/paramee.webp" },
    { name: "P.P. Sedna Dehemi Dharana", role: "Chief Coordinator, Reporting & Administration", photo: "assets/team/dehemi.webp" },
    { name: "T.D. Vinuka Ransath Pulsitha", role: "Chief Coordinator, Membership", photo: "" }
  ],
  directors: [
    { name: "Viththarachchige Geemeth Manvidu Hewa", role: "Editorial Director", photo: "assets/team/geemeth.webp" },
    { name: "Janiru Oshan Rubasinghe", role: "Director of PR", photo: "assets/team/janiru.webp" },
    { name: "Jayaweera Liyana Patabadige Sasindu Nimsara", role: "Director of Fundraising", photo: "assets/team/sasindu.webp" },
    { name: "Nadithya Namaljie Abeysiri Narayana Wanigarathne", role: "Director of Education", photo: "assets/team/nadithya.webp" },
    { name: "Risath Athsara Wijethunga", role: "Director of IT", photo: "assets/team/risath.webp" },
    { name: "Vithana Abeywickrama Isum Ayuka", role: "Director of Joint Projects", photo: "" },
    { name: "Rashmika Sithumini Kodikara", role: "Director of Sports & Recreation", photo: "assets/team/rashmika.webp" },
    { name: "K.H.G. Yasasmi Himasha Theekshani Gamage", role: "Director of Service", photo: "assets/team/yasasmi.webp" },
    { name: "Tilmi P P Vidanage", role: "Director of International Relations", photo: "assets/team/tilmi.webp" },
    { name: "Loku Bogahawattage Vinudi Sahansa", role: "Director of Fellowship", photo: "assets/team/vinudi.webp" }
  ],
  members: [
    "B.M. Induwara Sadew Akash",
    "Binadie Mansarie",
    "Bisandii Senupaba",
    "Buwanaji Imesha Dias Nagahawatte",
    "Báthila Sithusahan Wellage",
    "Dewmini Vipularathna",
    "Dikwella Vithanage Mayumi Dulakshi",
    "Elgiriya Liyanage Dinuli Thihara Savindi",
    "Esandi Sanathmi Methnuli Liyanapathirana",
    "H.H. Pamuda Himsara",
    "H.H. Teeshan Piumakara",
    "H.K. Pawara Manditha Wijesekara",
    "H.K.D. Malki Himasha",
    "H.L. Sandani Sanjana Liyanage",
    "H.M. Wageesha Ramith Dayarathne",
    "Hewa Heenpallage Amaya Kawmadi",
    "Isumi Sehansa Gunawardhana",
    "J.M. Sanuji Nihara Udayangi",
    "Jayasekara Vithanage Nimlini Sandesna Jayasekara",
    "K.G. Dinumi Navodya",
    "Kithmi Wickramaarachchi",
    "M. Tareesha Namindi De Silva",
    "Madduma Bogahawatta Yenusha Bimsara",
    "Mahith Wickramasinghe",
    "Methmi Bihansa Amarasinghe",
    "N.V.P. Ganguli Tharumini",
    "Naduthilaka Buddha Korala Siluni Disansa Wijesiri Gunawardhane",
    "Nallaperuma Arachchige Pasandi Sahansa",
    "Nethmina Dewsara",
    "Nitheesha Indusarani Edirisooriya",
    "Osala Jayasinghe Karunaratne",
    "Osheedh Irun Shanuka Jansz",
    "P.L. Tharindu Malshan",
    "Parana Vidana Arachchige Jithmi Himasha",
    "Pramukha Gallage",
    "Prathapa Sooriya Arachchige Ovini Vindya Dayananda",
    "Prathapage Nethasha Mansari Wijesinghe",
    "R.A. Dulina Senhas",
    "Ranhoti Bandaralage Thihansa Sanidi",
    "Rathnayake Mudiyanselage Yeneesa Sayori Rathnayake",
    "Risandi Ramasinghe",
    "S.A. Chamindu Dewmith",
    "S.D. Ganuli Hasithma",
    "Sanuthi Subaja Ediriweera",
    "Serasinghe Pathiranage Shaweri Nikasha",
    "Shaniya Bhagya Galhenage",
    "Sinali Tharumila Sudusinghe",
    "Sithika Dilmith Karasinghe Arachchi",
    "T.W. Hewawitharana",
    "Tashmitha Dulmina Hewavitharana",
    "Vidana Gamage Hithasi Devindi",
    "W.A.K. Chathuni Nethmini Priyankara",
    "W.K. Nulari Sasandi",
    "W.L. Tharushi Kavindya"
  ]
};
