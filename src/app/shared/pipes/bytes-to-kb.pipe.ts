import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'bytesToKb',
})
export class BytesToKbPipe implements PipeTransform {
    transform(bytes: number): string {
        const kilobytes = bytes / 1024; // 1 kilobyte = 1024 bytes
        return kilobytes.toFixed(0); // Mostrar el resultado sin decimales
    }
}