
# Markwhen File Sync
*This is an [Obsidian](https://obsidian.md/) plugin.*

Synchronize Properties from your Obsidian notes with [Markwhen](https://github.com/mark-when/obsidian-plugin) timeline files.

## Features
- Bidirectional synchronization
- Customizable grouping and sorting
- Flexible filtering options
- Auto-sync capability
- Status tag support

A possible use case is goal planning, where you can visualize projects and milestones with Markwhen, see for more informations my [Medium-Article](https://medium.com/@jahnke.rouven/a-multi-level-goal-planning-system-using-obsidian-29b94acd22f8).


## Installation
1. Open Obsidian Settings
2. Search for "Markwhen File Sync"
3. Install and Enable

## Settings
1. Set the *timeline file path* to the path to the markwhen-timeline (include .mw)
2. Set the *notes folder path* to the path to the folder in which you have your notes, which you want to synchronize with the Markwhen-Timeline-File.
3. Enable or disable the bidirectional synchronization.
   - if you enable it, then the *date* and *endDate* will synchronize from the notes to the timeline and the opposite direction
   - if you disable it, then the synchronization will synchronize only from tthe notes to the timeline
4. In the next step you have to set the name of the tag-property in your notes (usually *tags*)
5. Then choose tags which are required for the notes (currently you can't leave it empty, *I'll modify it as soon as possible*)
6. Additionally you can choose a property to group the files (for each different value of this property it is another group)
7. So you can also choose a property, such that the value of this is a tag to the Markwhen-Events in the timeline-note (you can leave it empty)

**The format of the properties for the dates in the notes are based on the format from *Full Calendar*, so the start-date is: *date* and the end-date is: *endDate*.**

*The other settings are less important and should be self-explanatory*

## Usage
To use the synchronization you have to create notes in the notes-folder. For example:
![image](https://github.com/user-attachments/assets/709820bd-9abb-4d80-909a-9e523d2685ed)

If you already have a Markwhen timeline note, you can toggle synchronization using the Sync Timeline button in the left sidebar.

So than you have the synchronisation between the notes and the timeline-note.
Only the *dates* will synchronize, the tags as well as the groups are **not synchronized**.

### Example
You have this notes:
![Screenshot 2025-01-30 172624](https://github.com/user-attachments/assets/c958dbb3-4ca3-4ee0-bd3f-47c94a08a8f5)

and
![Screenshot 2025-01-30 172604](https://github.com/user-attachments/assets/cb850b8e-cb44-449c-978b-44010e7785e6)
So than you can toggle the synchronization:
![image](https://github.com/user-attachments/assets/36e9c642-ec87-413e-af48-2cd7ff117f11)
Than the markwhen-note going to be updated:
![Screenshot 2025-01-30 172701](https://github.com/user-attachments/assets/fc65278f-8e44-4d91-a312-d6b240acd82f)
and you can see the timeline:
![Screenshot 2025-01-30 172724](https://github.com/user-attachments/assets/37b6603f-75b4-4bbf-bb32-526831185c97)


## Support
If you encounter any issues or have suggestions, please open an issue on GitHub.

## License
MIT License


<!--
# Milestone Timeline Sync for Obsidian

A plugin for Obsidian that synchronizes milestone notes with Markwhen timeline files.

## Features

- Bidirectional synchronization between milestone notes and timeline
- Customizable grouping and sorting options
- Flexible filtering capabilities
- Auto-sync functionality
- Detailed logging and debugging options
- Configurable notifications
- Status tag support

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins
3. Click Browse and search for "Milestone Timeline Sync"
4. Install and Enable the plugin

## Configuration

### Basic Settings
- Set paths for Markwhen file and milestones folder
- Configure synchronization behavior

### Grouping Options
- Enable/disable grouping
- Choose grouping property
- Set sorting methods

### Filtering Options
- Configure status exclusions
- Set date filtering options
- Define folder exclusions

### Format Settings
- Customize date formats
- Configure group markers
- Set status tag display

## Usage

1. Set up your milestone notes with required frontmatter:
   ```yaml
   ---
   tags:
     - goal
     - focus
   date: YYYY-MM-DD
   endDate: YYYY-MM-DD
   Status: in-progress
   Jahresziel: "[[Your Goal]]"
   ---
   -->
