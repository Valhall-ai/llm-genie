"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FormatValidator {
    constructor() {
        this.test = true;
    }
    numberedList(input, defaults = {}) {
        console.debug('numberedList\n', input, defaults);
        if (typeof input !== 'string') {
            throw new Error('Bad input supplied to numberedList: ' + input);
        }
        else if (!input)
            return false;
        input = input.trim();
        let lines = input.split(/\n+/); // Allow multiple line breaks between items
        let list = [];
        let valid = true;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            let regex = new RegExp(`^${i + 1}\\.?\\s+([\\s\\S]+)$`, 'm'); // Add multiline flag and support for multiline input
            let match = line.match(regex);
            if (match) {
                list.push(match[1]);
            }
            else if (line === '') {
                continue; // Ignore empty lines
            }
            else {
                valid = false;
                break;
            }
        }
        console.debug('defaults', defaults);
        if (defaults.constrainedChoices) {
            console.debug('DEBUG defaults.constrainedChoices', defaults.constrainedChoices);
            if (!this.constrainedArray(list, defaults.constrainedChoices, {
                singleChoice: defaults.singleChoice
            })) {
                valid = false;
            }
        }
        return valid ? { list } : false;
    }
    bulletedList(input, defaults) {
        console.debug('bulletedList\n', input, defaults);
        if (!input)
            return false;
        input = input.trim();
        let lines = input.split(/\n+/); // Allow multiple line breaks between items
        let list = [];
        let valid = true;
        for (let line of lines) {
            line = line.trim();
            let regex = /^[-*+]\s+([\s\S]+)$/m; // Match "-", "*", and "+" and allow multiple spaces, support multiline input
            let match = line.match(regex);
            if (match) {
                let item = match[1]; // Get the content without the bullet
                // Remove the trailing period if present
                if (item.endsWith('.')) {
                    item = item.slice(0, -1);
                }
                list.push(item);
            }
            else if (line === '') {
                continue; // Ignore empty lines
            }
            else {
                // Check if it's a non-bulleted single line response
                if (lines.length === 1) {
                    // Prepend a bullet if necessary
                    line = "- " + line;
                    let item = line.substring(2); // Get the content without the bullet
                    // Remove the trailing period if present
                    if (item.endsWith('.')) {
                        item = item.slice(0, -1);
                    }
                    list.push(item);
                }
                else {
                    valid = false;
                    break;
                }
            }
            if (defaults.constrainedChoices) {
                console.debug('DEBUG defaults.constrainedChoices', defaults.constrainedChoices);
                if (!this.constrainedArray(list, defaults.constrainedChoices, {
                    singleChoice: defaults.singleChoice
                })) {
                    valid = false;
                }
            }
        }
        return valid ? { list } : false;
    }
    yesNo(input) {
        console.debug('yesNo\n', input);
        input = input.trim().toLowerCase();
        // Check for trailing period and remove it
        if (input.endsWith('.')) {
            input = input.slice(0, -1);
        }
        if (input === "yes" || input === "no") {
            return { bool: input === "yes" };
        }
        else {
            return false;
        }
    }
    itemInArray(input, items) {
        console.debug('itemInArray\n', input, items);
        input = input.trim().toLowerCase();
        let foundItem = items.find((item) => item.trim().toLowerCase() === input);
        return foundItem ? { item: foundItem } : false;
    }
    constrainedArray(testedArray, optionsArray, defaults = { debug: false, singleChoice: false }) {
        console.debug('constrainedArray\n', testedArray, optionsArray, defaults);
        let validList = true;
        if (testedArray && optionsArray) {
            if (testedArray.length === 0) {
                if (defaults.debug)
                    console.log('Invalid list: Empty.');
                return false;
            }
            if (defaults.singleChoice && testedArray.length > 1) {
                if (defaults.debug)
                    console.log('Invalid list: Only one option can be selected.');
                return false;
            }
            validList = testedArray.every(item => {
                const itemFound = this.itemInArray(item, optionsArray);
                if (defaults.debug) {
                    if (itemFound) {
                        console.log('Valid item:', item, 'is one of constrained choices:', optionsArray);
                    }
                    else {
                        console.log('Invalid item:', item, 'not one of constrained choices:', optionsArray);
                    }
                }
                return itemFound;
            });
        }
        return validList ? { list: testedArray } : false;
    }
}
exports.default = FormatValidator;
//# sourceMappingURL=format-validator.js.map