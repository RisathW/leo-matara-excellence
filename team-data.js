/*
  TEAM DATA: the only file you need to edit to update the team.

  - exec:      the 5 officers shown on the home page (in this order); members.html shows them first in the executive committee
  - moreExec:  the other executive members, shown after the officers on members.html under "Executive committee"
  - members:   everyone else, shown on members.html under "Members"
  - name:      leave "" until you have it (the card shows "To be announced")
  - photo:     path to a square-ish headshot, e.g. "assets/team/nimal.jpg" (leave "" for a silhouette)
  - title:     optional prefix such as "Leo Lion" or "Leo"; it is shown before the name

  Rename, add or remove any role to match your constitution.
*/
window.TEAM = {
  exec: [
    { title: "Leo", name: "Ramudi Liyanage", role: "President", photo: "assets/president.webp", cutout: true, href: "president.html" },
    { name: "", role: "Vice President", photo: "" },
    { name: "", role: "Secretary", photo: "" },
    { name: "", role: "Treasurer", photo: "" },
    { name: "", role: "Advisor", photo: "" }
  ],
  moreExec: [
    { name: "", role: "Immediate Past President", photo: "" },
    { name: "", role: "Assistant Secretary", photo: "" },
    { name: "", role: "Assistant Treasurer", photo: "" },
    { name: "", role: "Membership Director", photo: "" },
    { name: "", role: "Projects Director", photo: "" },
    { name: "", role: "Public Relations Director", photo: "" },
    { name: "", role: "Editor", photo: "" },
    { name: "", role: "IT Director", photo: "" },
    { name: "", role: "Fundraising Director", photo: "" },
    { name: "", role: "Training Director", photo: "" },
    { name: "", role: "Environment Director", photo: "" },
    { name: "", role: "Health & Welfare Director", photo: "" },
    { name: "", role: "Education Director", photo: "" },
    { name: "", role: "Social Media Director", photo: "" }
  ],
  members: [
    // { title: "Leo", name: "Full Name", role: "Member", photo: "assets/team/full-name.jpg" },
  ]
};
