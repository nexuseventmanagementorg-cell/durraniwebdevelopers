declare module "@sfpy/node-core" {
    namespace Safepay {
        namespace User {
            class PushNotifications {
                register(params?: any, options?: any): Promise<any>;
                deactivate(params?: any, options?: any): Promise<any>;
            }
        }
    }
}
