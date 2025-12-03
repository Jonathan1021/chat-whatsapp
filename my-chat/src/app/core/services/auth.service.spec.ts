import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully', (done) => {
    service.login('juan@test.com', 'password').subscribe(user => {
      expect(user).toBeTruthy();
      expect(user.email).toBe('juan@test.com');
      expect(service.isAuthenticated()).toBe(true);
      done();
    });
  });

  it('should logout successfully', () => {
    service.currentUser.set({ 
      id: '1', 
      name: 'Test', 
      email: 'test@test.com', 
      avatar: '👨', 
      online: true 
    });
    
    service.logout();
    
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should persist user in localStorage', (done) => {
    service.login('maria@test.com', 'password').subscribe(() => {
      const stored = localStorage.getItem('currentUser');
      expect(stored).toBeTruthy();
      
      const user = JSON.parse(stored!);
      expect(user.email).toBe('maria@test.com');
      done();
    });
  });
});
