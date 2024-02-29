import { SelectItem } from 'primeng/api';

export function enumToSelectItems(enumParam: {}): SelectItem[] {
    return Object.keys(enumParam).map((key) => ({
        value: key,
        label: enumParam[key],
    }));
}

export function getRandomNumber() {
    const min = 0;
    const max = 999999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function mapFormValueWithoutFilesAndDatesAsString(obj: any): any {
    const newObj: any = {};
    Object.keys(obj).forEach((key) => {
        if (!(obj[key] instanceof File) && !(obj[key] instanceof FileList)) {
            if (obj[key] instanceof Date) {
                newObj[key] = obj[key].toISOString().split('T')[0]; // Convertir la fecha a cadena ISO
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                newObj[key] = this.mapFormValueWithoutFilesAndDatesAsString(
                    obj[key]
                );
            } else {
                newObj[key] = obj[key];
            }
        }
    });
    return newObj;
}

export function hasValues(obj: any): boolean {
    if (!obj) {
        return false; // Si obj es null o undefined, retornamos false
    }
    return Object.values(obj).some(
        (value) => value !== null && value !== undefined
    );
}
