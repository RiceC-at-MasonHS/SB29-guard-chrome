# Google Sheets Data Structure for SB29-guard-chrome

This document outlines the recommended data structure for the Google Sheet that serves as the authoritative source of truth for the SB29 Guard Chrome Extension. It covers the columns required for the extension's functionality, additional columns for comprehensive DPA management by school districts, and suggested questions for a teacher submission form.

## 1. Published CSV Data Structure (for Extension Consumption)

The Google Sheet should have a "Published" view or tab that is exported as a CSV and used directly by the SB29 Guard Chrome Extension. This CSV must contain the following columns with exact names to ensure proper functionality:

| Column Name        | Data Type | Description                                                                                                                                                                                                                                                                                                                               | Example Value                                |
| :----------------- | :-------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------- |
| `software_name`    | String    | The official name of the software or application.                                                                                                                                                                                                                                                                                         | `GitHub`                                     |
| `resource_link`    | URL       | The primary URL associated with the software. This is used for matching domains and for the "Full Details" link in the extension popup.                                                                                                                                                                                                 | `https://github.com/`                        |
| `current_tl_status`| String    | The current Teaching & Learning (T&L) approval status. This status will directly influence the extension's icon color and shape. Allowed values should align with `icon-strategy.yaml`.                                                                                                                                                     | `Approved` (Green Circle), `Requested` (Orange Square) |
| `current_dpa_status`| String    | The current Data Privacy Agreement (DPA) status. This text will be displayed in the extension's popup to provide at-a-glance information to the user.                                                                                                                                                                                   | `Approved`, `Requested`, `Denied`            |
| `purpose`          | String    | A brief explanation of the software's educational purpose. This text will be displayed in the extension's popup.                                                                                                                                                                                                                            | `An essential tool for teaching and learning computer science.` |
| `use_instructions` | String    | Detailed instructions or important notes for teachers regarding the use of the software. This text will be displayed in the extension's popup under the "Plain Language Explanation" section.                                                                                                                                                 | `Online collaboration and storage space for code...` |
| `dpa_link`         | URL       | A direct link to the Data Protection Addendum (DPA) or relevant privacy policy document. This will be used for the "Full Details on MCS App Hub" link. If not available, districts can link to their own internal review page or the vendor's main privacy page.                                                                            | `https://github.com/customer-terms/github-data-protection-agreement` |

**Important Notes for Published CSV:**
*   **Case Sensitivity:** Column names must match exactly as listed, including case.
*   **Data Types:** Ensure data conforms to the specified types. URLs should be valid and accessible.
*   **Status Values:** Standardize status values (e.g., "Approved", "Requested", "Denied") to ensure consistent icon and text display.

## 2. Recommended Internal DPA Management Columns (for District Use)

Districts are recommended to collect and manage additional data points in their master Google Sheet to support a comprehensive DPA review and management process. These columns are not directly consumed by the extension's published CSV but are crucial for internal record-keeping, compliance, and decision-making.

| Column Name          | Data Type | Description                                                                                                        | Example Value                                  |
| :------------------- | :-------- | :----------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- |
| `id`                 | String    | Unique identifier for the DPA request. (Auto-generated)                                                            | `842102cd-8ba8-4571-ae86-da23663d117f`         |
| `vendor_name`        | String    | The official name of the software vendor.                                                                          | `Legal Department, GitHub, Inc.`               |
| `vendor_email`       | String    | Contact email for the vendor's legal or privacy department.                                                        | `legal-support@github.com`                     |
| `vendor_address`     | String    | Physical address of the vendor's legal department.                                                                 | `GitHub, Inc., 88 Colin P. Kelly Jr. Street...` |
| `requester_name`     | String    | Name of the staff member who requested the DPA review.                                                             | `Corey Rice`                                   |
| `requester_email`    | String    | Email of the staff member who requested the DPA review.                                                            | `ricec@masonohioschools.com`                   |
| `request_date`       | Timestamp | Date and time the DPA review was initially requested.                                                              | `2025-09-02T01:01:46.399212+00:00`             |
| `review_date`        | Timestamp | Date and time the DPA was officially reviewed by the district.                                                     | `2025-09-05T15:05:49.41+00:00`                 |
| `reviewed_by`        | String    | Name/title of the district staff member who performed the review.                                                  | `District Legal Counsel`                       |
| `rejection_feedback` | String    | Detailed reasons if the DPA request was denied.                                                                    | `Vendor does not meet SB29 data deletion requirements.` |
| `district_contact_name`| String    | Name of the district's primary contact for this DPA (if different from reviewer).                                  | `Jane Doe`                                     |
| `district_contact_title`| String    | Title of the district's primary contact.                                                                           | `Director of Technology`                       |
| `district_contact_email`| String    | Email of the district's primary contact.                                                                           | `jane.doe@schooldistrict.org`                  |
| `district_contact_phone`| String    | Phone of the district's primary contact.                                                                           | `555-123-4567`                                 |
| `grades_used`        | Comma-separated Strings | List of grades/student levels where the software is used.                                                | `9,10,11,12`                                   |
| `contract_start_date`| Date      | Start date of the contract with the vendor.                                                                        | `2025-08-01`                                   |
| `contract_end_date`  | Date      | End date of the contract with the vendor.                                                                          | `2026-07-31`                                   |
| `updated_at`         | Timestamp | Last date and time the DPA entry was updated. (Auto-updated)                                                       | `2025-09-05T15:05:49.41+00:00`                 |
| `building`           | Comma-separated Strings | List of school buildings where the software is used.                                                     | `MHS,MMS`                                      |
| `content_area`       | Comma-separated Strings | List of content areas/departments where the software is used.                                            | `STEAM,Applied Technology`                     |
| `courses`            | String    | Specific courses where the software is used.                                                                       | `AP Computer Science Principles, Cybersecurity 1` |
| `number_teachers`    | Integer   | Estimated number of teachers using the software.                                                                   | `2`                                            |
| `number_students`    | Integer   | Estimated number of students using the software.                                                                   | `100`                                          |
| `spoken_to_sales`    | Boolean   | Indicates if a conversation with the vendor's sales team has occurred regarding educational pricing/terms.         | `TRUE`                                         |
| `resource_type`      | Comma-separated Strings | Classification of the resource (e.g., `Instructional Tool`, `Assessment`).                               | `Other,Skill Practice`                         |
| `resource_other`     | String    | If `resource_type` includes "Other", specify the type here.                                                        | `Software Version Control and collaboration platform` |
| `how_support_learning`| String    | Explanation of how the resource supports learning.                                                                 | `Enhances coding collaboration and project management.` |
| `how_accessible_needs`| String    | Description of how the resource meets accessibility needs.                                                         | `WCAG 2.1 AA compliant`                        |
| `research_studies`   | String    | Links or references to research studies supporting the resource's efficacy.                                        | `Link to study X, Link to study Y`             |
| `cost`               | String    | Cost of the resource, including licensing models.                                                                  | `Free (for education), $500/year for premium` |
| `anything_else`      | String    | Any additional notes or considerations for the DPA review.                                                         | `Microsoft product, strong education section...` |
| `company_name`       | String    | The company name associated with the resource. (Can be same as vendor_name)                                        | `GitHub, Inc.`                                 |
| `dpa_request_date`   | Date      | Date when the DPA itself was requested from the vendor.                                                            | `2025-09-01`                                   |
| `internal_notes`     | String    | Internal notes for district staff, not for public consumption.                                                     | `Follow-up needed with legal on clause 4.2.`   |
| `resource_category`  | String    | Broader categorization of the resource (e.g., `LMS`, `Productivity Tool`).                                         | `Coding Platform`                              |
| `support_level`      | String    | Internal support level assigned to the resource (e.g., `Tier 1`, `Tier 2`).                                        | `Tier 1`                                       |
| `how_used`           | String    | Detailed description of how the software is used in practice.                                                      | `Students create repositories for projects...` |
| `student_login_link` | URL       | Direct link to the student login page for the resource.                                                            | `https://github.com/login`                     |
| `staff_login_link`   | URL       | Direct link to the staff/teacher login page for the resource.                                                      | `https://github.com/login`                     |

## 3. Google Form Questions for Teacher Site/App Request

To streamline the DPA review process, districts can use a Google Form (or similar survey tool) to collect initial information from teachers requesting new software or applications. The questions below are designed to gather data that can directly populate the "Internal DPA Management Columns" in the master Google Sheet.

**Form Title:** New Software/Application DPA Request Form

**Introduction:** Please complete this form to request a Data Privacy Agreement (DPA) review for any new software, website, or application you wish to use with students. Your detailed responses will help expedite the review process.

---

**Questions:**

1.  **Your Name:** (Short answer text)
    *   *Maps to:* `requester_name`
2.  **Your School Email Address:** (Short answer text)
    *   *Maps to:* `requester_email`
3.  **Name of Software/Application:** (Short answer text)
    *   *Maps to:* `software_name`
4.  **Website Link (URL) for the Software/Application:** (Short answer text, validation: URL)
    *   *Maps to:* `resource_link`
5.  **Official Company/Vendor Name:** (Short answer text)
    *   *Maps to:* `vendor_name`, `company_name`
6.  **Vendor's Legal/Privacy Contact Email (if known):** (Short answer text, validation: email)
    *   *Maps to:* `vendor_email`
7.  **Briefly describe the educational purpose of this software/application:** (Paragraph text)
    *   *Maps to:* `purpose`
8.  **In which grades/student levels will this software/application be used?** (Checkboxes: `K`, `1`, `2`, ..., `12`, `Adult Education`, `Other (please specify)`)
    *   *Maps to:* `grades_used`
9.  **In which school building(s) will this software/application be used?** (Checkboxes: List all district schools, `Other (please specify)`)
    *   *Maps to:* `building`
10. **Which content area(s) or department(s) will use this software/application?** (Checkboxes: `English Language Arts`, `Math`, `Science`, `Social Studies`, `Arts`, `Music`, `Physical Education`, `Health`, `World Languages`, `Special Education`, `Applied Technology`, `STEAM`, `Other (please specify)`)
    *   *Maps to:* `content_area`
11. **Are there specific courses where this software/application will be used?** (Paragraph text)
    *   *Maps to:* `courses`
12. **Estimated number of teachers who will use this software/application:** (Number)
    *   *Maps to:* `number_teachers`
13. **Estimated number of students who will use this software/application:** (Number)
    *   *Maps to:* `number_students`
14. **How does this software/application support student learning?** (Paragraph text)
    *   *Maps to:* `how_support_learning`
15. **How does this software/application address accessibility needs for students?** (Paragraph text)
    *   *Maps to:* `how_accessible_needs`
16. **Is there a cost associated with this software/application? If so, please describe the cost and licensing model.** (Paragraph text)
    *   *Maps to:* `cost`
17. **What type of resource is this?** (Checkboxes: `Instructional Tool`, `Assessment`, `Communication Platform`, `Content Library`, `Skill Practice`, `Staff/Teacher Resource`, `Other (please specify)`)
    *   *Maps to:* `resource_type`, `resource_other`
18. **Please provide any additional relevant information, notes, or instructions for using this software/application.** (Paragraph text)
    *   *Maps to:* `anything_else`, `use_instructions`
19. **Do students log in directly to this resource? If yes, please provide the student login URL (if different from the main website).** (Short answer text, validation: URL)
    *   *Maps to:* `student_login_link`
20. **Do staff/teachers log in directly to this resource? If yes, please provide the staff/teacher login URL (if different from the main website).** (Short answer text, validation: URL)
    *   *Maps to:* `staff_login_link`
21. **Have you already spoken to a sales representative from this vendor about educational pricing or terms?** (Multiple choice: `Yes`, `No`)
    *   *Maps to:* `spoken_to_sales`
22. **If available, please provide a direct link to the vendor's Data Protection Addendum (DPA) or Privacy Policy.** (Short answer text, validation: URL)
    *   *Maps to:* `dpa_link`
