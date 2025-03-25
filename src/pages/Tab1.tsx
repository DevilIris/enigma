import React from 'react';
import { motion } from 'framer-motion';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonPage, IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent } from '@ionic/react';
import { arrowForward, settings, tv } from 'ionicons/icons';
import { Cpu, Music, Podcast, Tv, Users, Settings } from 'lucide-react';
import './Tab1.css';

const Tab1: React.FC = () => {
    return (
        <IonPage>
            {/* --- Hero Section --- */}
            <IonHeader className="hero-header">
                <IonToolbar className="hero-toolbar">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                        className="hero-content"
                    >
                        <IonTitle className="hero-title">
                            Puentech.io
                        </IonTitle>
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.3 }}
                            className="hero-subtitle"
                        >
                            Your partner for cutting-edge technology solutions in media, entertainment, and beyond.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.6 }}
                        >
                            <IonButton
                                className="hero-button"
                                expand="block"
                                shape="round"
                            >
                                <IonIcon icon={arrowForward} slot="start" />
                                Learn More
                            </IonButton>
                        </motion.div>
                    </motion.div>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen>
                {/* --- Services Section --- */}
                <section className="services-section">
                    <motion.h2
                        initial={{ opacity: 0, y: -30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: 'easeInOut' }}
                        className="services-title"
                    >
                        Our Services
                    </motion.h2>
                    <IonGrid>
                        <IonRow>
                            {/* Service Card 1 */}
                            <IonCol size="12" sizeMd="6" sizeLg="4">
                                <ServiceCard
                                    title="Post & Production Consulting"
                                    description="Expert guidance for optimizing your post-production workflows."
                                    icon={Settings}
                                    delay={0}
                                />
                            </IonCol>
                            {/* Service Card 2 */}
                            <IonCol size="12" sizeMd="6" sizeLg="4">
                                <ServiceCard
                                    title="Live Event Services"
                                    description="Streaming, production, and internet solutions for special events."
                                    icon={Podcast}
                                    delay={0.2}
                                />
                            </IonCol>
                            {/* Service Card 3 */}
                            <IonCol size="12" sizeMd="6" sizeLg="4">
                                <ServiceCard
                                    title="Cinema & TV Solutions"
                                    description="Development and implementation of automated workflows with Cloud and AI."
                                    icon={tv}
                                    delay={0.4}
                                />
                            </IonCol>
                            {/* Service Card 4 */}
                            <IonCol size="12" sizeMd="6" sizeLg="4">
                                <ServiceCard
                                    title="Music Industry Solutions"
                                    description="Consulting for production, IT, and organizational changes."
                                    icon={Music}
                                    delay={0.6}
                                />
                            </IonCol>
                            {/* Service Card 5 */}
                            <IonCol size="12" sizeMd="6" sizeLg="4">
                                <ServiceCard
                                    title="Government & Enterprise Solutions"
                                    description="Keynote production and technology services for conferences."
                                    icon={Users}
                                    delay={0.8}
                                />
                            </IonCol>
                            {/* Service Card 6 */}
                            <IonCol size="12" sizeMd="6" sizeLg="4">
                                <ServiceCard
                                    title="Technology Integration"
                                    description="Implementation of new technologies."
                                    icon={Cpu}
                                    delay={1.0}
                                />
                            </IonCol>
                        </IonRow>
                    </IonGrid>
                </section>
            </IonContent>
        </IonPage>
    );
};

// ServiceCard Component
const ServiceCard = ({ title, description, icon: Icon, delay = 0 }: { title: string, description: string, icon: any, delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeInOut', delay }}
        whileHover={{ scale: 1.03 }}
    >
        <IonCard className="service-card">
            <IonCardHeader>
                <IonIcon icon={Icon} className="service-icon" />
                <IonCardTitle className="service-card-title">{title}</IonCardTitle>
                <IonCardSubtitle className="service-card-subtitle">{description}</IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
                {/* Add more specific content if needed */}
            </IonCardContent>
        </IonCard>
    </motion.div>
);

export default Tab1;