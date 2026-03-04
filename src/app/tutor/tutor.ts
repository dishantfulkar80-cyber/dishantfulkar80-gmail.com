import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TutorService } from '../tutor.service';
import { marked } from 'marked';

@Component({
  selector: 'app-tutor',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="flex flex-col h-screen bg-[#f5f2ed] text-[#1a1a1a] font-serif">
      <!-- Header -->
      <header class="p-6 border-b border-black/10 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-[#5A5A40] flex items-center justify-center text-white shadow-lg">
            <mat-icon>school</mat-icon>
          </div>
          <div>
            <h1 class="text-2xl font-light tracking-tight">Socratic Tutor</h1>
            <p class="text-xs uppercase tracking-widest opacity-60 font-sans">Patient • Compassionate • Wise</p>
          </div>
        </div>
        <button mat-icon-button (click)="clearChat()" title="New Session">
          <mat-icon>refresh</mat-icon>
        </button>
      </header>

      <!-- Chat Area -->
      <main #scrollContainer class="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
        @if (messages().length === 0) {
          <div class="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in duration-700">
            <div class="max-w-md space-y-4">
              <h2 class="text-4xl font-light italic text-[#5A5A40]">Welcome, student.</h2>
              <p class="text-lg opacity-80 leading-relaxed">
                I'm here to walk beside you as you master these concepts. 
                Upload a photo of a problem you're working on, and we'll take it one step at a time.
              </p>
              <div class="pt-8">
                <label class="cursor-pointer group">
                  <div class="border-2 border-dashed border-[#5A5A40]/30 rounded-3xl p-12 transition-all group-hover:border-[#5A5A40] group-hover:bg-white/50">
                    <mat-icon class="text-4xl mb-4 text-[#5A5A40]">add_a_photo</mat-icon>
                    <p class="font-sans font-medium">Click to upload a math problem</p>
                  </div>
                  <input type="file" class="hidden" (change)="onFileSelected($event)" accept="image/*">
                </label>
              </div>
            </div>
          </div>
        }

        @for (msg of messages(); track $index) {
          <div class="flex flex-col" [ngClass]="msg.role === 'user' ? 'items-end' : 'items-start'">
            <div 
              class="max-w-[85%] md:max-w-[70%] p-6 rounded-3xl shadow-sm transition-all"
              [ngClass]="msg.role === 'user' ? 'bg-[#5A5A40] text-white rounded-tr-none' : 'bg-white text-[#1a1a1a] rounded-tl-none border border-black/5'"
            >
              @if (msg.image) {
                <img [src]="msg.image" alt="Uploaded math problem" class="rounded-xl mb-4 max-h-64 object-contain shadow-inner" referrerpolicy="no-referrer">
              }
              <div class="prose prose-sm max-w-none" [innerHTML]="renderMarkdown(msg.text)"></div>
            </div>
            <span class="text-[10px] uppercase tracking-widest opacity-40 mt-2 px-2 font-sans">
              {{ msg.role === 'user' ? 'You' : 'Tutor' }}
            </span>
          </div>
        }

        @if (isLoading()) {
          <div class="flex items-start gap-4 animate-pulse">
            <div class="bg-white p-6 rounded-3xl rounded-tl-none border border-black/5 flex items-center gap-3">
              <div class="flex gap-1">
                <div class="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div class="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span class="text-sm italic opacity-60">Thinking carefully...</span>
            </div>
          </div>
        }
      </main>

      <!-- Input Area -->
      <footer class="p-4 md:p-8 bg-white/80 backdrop-blur-xl border-t border-black/5">
        <div class="max-w-4xl mx-auto flex items-end gap-4">
          <div class="relative flex-1">
            <textarea 
              [(ngModel)]="userInput" 
              (keydown.enter)="handleKeyDown($event)"
              placeholder="Ask a question or explain your thinking..."
              class="w-full bg-[#f5f2ed] border-none rounded-2xl p-4 pr-12 focus:ring-2 focus:ring-[#5A5A40] transition-all resize-none min-h-[56px] max-h-32 font-sans"
              [disabled]="isLoading()"
            ></textarea>
            <label class="absolute right-3 bottom-3 cursor-pointer hover:text-[#5A5A40] transition-colors">
              <mat-icon>attach_file</mat-icon>
              <input type="file" class="hidden" (change)="onFileSelected($event)" accept="image/*">
            </label>
          </div>
          <button 
            mat-fab 
            class="!bg-[#5A5A40] !text-white shadow-lg hover:scale-105 transition-transform"
            (click)="sendMessage()"
            [disabled]="isLoading() || (!userInput.trim() && !selectedImage())"
          >
            <mat-icon>send</mat-icon>
          </button>
        </div>
        <p class="text-center text-[10px] opacity-40 mt-4 uppercase tracking-[0.2em] font-sans">
          Step by step, we learn together.
        </p>
      </footer>

      <!-- Image Preview Overlay -->
      @if (selectedImage()) {
        <div class="fixed bottom-32 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-bottom-4">
          <div class="bg-white p-2 rounded-2xl shadow-2xl border border-black/10 flex items-center gap-3">
            <img [src]="selectedImage()" alt="Selected image preview" class="w-16 h-16 rounded-lg object-cover">
            <div class="pr-4">
              <p class="text-xs font-sans font-bold">Image attached</p>
              <button class="text-[10px] text-red-500 uppercase tracking-widest font-bold" (click)="selectedImage.set(null)">Remove</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .prose :where(p):not(:where([class~="not-prose"], [class~="not-prose"] *)) {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }
    textarea::-webkit-scrollbar { width: 4px; }
    textarea::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
  `]
})
export class TutorComponent implements AfterViewChecked {
  private tutorService = inject(TutorService);
  
  messages = this.tutorService.messages;
  isLoading = this.tutorService.isLoading;
  userInput = '';
  selectedImage = signal<string | null>(null);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch {
      // Ignore scroll errors
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.selectedImage.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async sendMessage() {
    const text = this.userInput.trim();
    const image = this.selectedImage();
    
    if (!text && !image) return;

    this.userInput = '';
    this.selectedImage.set(null);
    
    await this.tutorService.sendMessage(text, image || undefined);
  }

  handleKeyDown(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat() {
    this.tutorService.clearHistory();
  }

  renderMarkdown(text: string): string {
    return marked.parse(text) as string;
  }
}
